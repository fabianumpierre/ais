import { parse } from "csv-parse/sync";

import {
  columnAliases,
  metricFieldLabels,
  type InternalMetricField,
} from "@/lib/csv/columnAliases";
import {
  detectColumnMapping,
  type ColumnMapping,
} from "@/lib/csv/detectColumnMapping";

export type ParsedMetricRow = {
  date: Date;
  format: string;
  theme: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

export type ParseMetricsCsvResult = {
  rows: ParsedMetricRow[];
  mapping: ColumnMapping;
  warnings: string[];
  missingRequiredFields: InternalMetricField[];
  availableHeaders: string[];
};

export class CsvMappingRequiredError extends Error {
  code = "MAPPING_REQUIRED" as const;

  constructor(
    message: string,
    public details: {
      availableHeaders: string[];
      mapping: ColumnMapping;
      missingRequiredFields: InternalMetricField[];
      missingOptionalFields: InternalMetricField[];
    },
  ) {
    super(message);
  }
}

class CsvRowValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function parseMetricsCSV(
  csvContent: string,
  options?: {
    manualMapping?: ColumnMapping;
  },
): ParseMetricsCsvResult {
  const delimiter = detectDelimiter(csvContent);
  const records = parse(csvContent, {
    bom: true,
    columns: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error("O CSV está vazio ou nao possui linhas de dados.");
  }

  const headers = Object.keys(records[0]);
  const detected = detectColumnMapping(headers);
  const mapping: ColumnMapping = {
    ...detected.mapping,
    ...(options?.manualMapping ?? {}),
  };
  const missingRequiredFields = requiredFields.filter((field) => !mapping[field]);
  const missingOptionalFields = optionalFields.filter((field) => !mapping[field]);

  if (missingRequiredFields.length > 0) {
    const missingLabels = missingRequiredFields
      .map((field) => metricFieldLabels[field])
      .join(", ");

    throw new CsvMappingRequiredError(
      `Nao foi possivel detectar automaticamente as colunas obrigatorias: ${missingLabels}. Confirme o mapeamento do CSV.`,
      {
        availableHeaders: headers,
        mapping,
        missingRequiredFields,
        missingOptionalFields,
      },
    );
  }

  const rows = records
    .map((row, index) => mapRecordToMetricRow(row, mapping, index + 2))
    .filter((row): row is ParsedMetricRow => row !== null);

  if (rows.length === 0) {
    throw new Error("Nenhuma linha valida foi encontrada no CSV.");
  }

  const warnings = missingOptionalFields.map(
    (field) =>
      `${metricFieldLabels[field]} nao detectado. O importador usara um valor padrao.`,
  );

  return {
    rows,
    mapping,
    warnings,
    missingRequiredFields,
    availableHeaders: headers,
  };
}

function detectDelimiter(csvContent: string) {
  const firstLine = csvContent.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function mapRecordToMetricRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
  lineNumber: number,
) {
  try {
    return {
      date: getMappedDate(row, mapping, lineNumber, "date"),
      format: getMappedValue(row, mapping, "format") || "Nao informado",
      theme: getMappedValue(row, mapping, "theme") || "Sem descricao",
      reach: getMappedNumber(row, mapping, "reach", lineNumber, true),
      likes: getMappedNumber(row, mapping, "likes", lineNumber, false) ?? 0,
      comments: getMappedNumber(row, mapping, "comments", lineNumber, false) ?? 0,
      saves: getMappedNumber(row, mapping, "saves", lineNumber, false) ?? 0,
      shares: getMappedNumber(row, mapping, "shares", lineNumber, false) ?? 0,
    };
  } catch (error) {
    if (error instanceof CsvRowValidationError) {
      throw error;
    }

    throw new Error(`Linha ${lineNumber} do CSV invalida.`);
  }
}

function getMappedValue(
  row: Record<string, string>,
  mapping: ColumnMapping,
  field: InternalMetricField,
) {
  const header = mapping[field];
  if (!header) {
    return "";
  }

  return (row[header] ?? "").trim();
}

function getMappedNumber(
  row: Record<string, string>,
  mapping: ColumnMapping,
  field: InternalMetricField,
  lineNumber: number,
  required: boolean,
) {
  const header = mapping[field];
  const raw = getMappedValue(row, mapping, field);

  if (!raw) {
    if (required) {
      throw new CsvRowValidationError(
        `Linha ${lineNumber}: ${metricFieldLabels[field]} ausente na coluna ${formatHeaderLabel(header)}.`,
      );
    }
    return null;
  }

  const normalized = raw
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) {
    throw new CsvRowValidationError(
      `Linha ${lineNumber}: ${metricFieldLabels[field]} invalido na coluna ${formatHeaderLabel(header)} com valor "${raw}".`,
    );
  }

  return Math.round(value);
}

function getMappedDate(
  row: Record<string, string>,
  mapping: ColumnMapping,
  lineNumber: number,
  field: InternalMetricField,
) {
  const header = mapping[field];
  const raw = getMappedValue(row, mapping, field);

  if (!raw) {
    throw new CsvRowValidationError(
      `Linha ${lineNumber}: ${metricFieldLabels[field]} ausente na coluna ${formatHeaderLabel(header)}.`,
    );
  }

  const trimmed = raw.trim();
  const slashDateTimeMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!slashDateTimeMatch) {
    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) {
      throw new CsvRowValidationError(
        `Linha ${lineNumber}: Data invalida na coluna ${formatHeaderLabel(header)} com valor "${raw}".`,
      );
    }
    return fallback;
  }

  const first = Number(slashDateTimeMatch[1]);
  const second = Number(slashDateTimeMatch[2]);
  const year = Number(slashDateTimeMatch[3]);
  const hours = Number(slashDateTimeMatch[4] ?? 0);
  const minutes = Number(slashDateTimeMatch[5] ?? 0);
  const seconds = Number(slashDateTimeMatch[6] ?? 0);

  const lowerHeader = header?.toLowerCase() ?? "";
  const preferMonthFirst =
    lowerHeader.includes("horario") ||
    lowerHeader.includes("published") ||
    lowerHeader.includes("publication") ||
    lowerHeader.includes("created");
  const isDayFirst = !preferMonthFirst && first > 12;
  const month = isDayFirst ? second : first;
  const day = isDayFirst ? first : second;
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);

  if (Number.isNaN(parsed.getTime())) {
    throw new CsvRowValidationError(
      `Linha ${lineNumber}: Data invalida na coluna ${formatHeaderLabel(header)} com valor "${raw}".`,
    );
  }

  return parsed;
}

function formatHeaderLabel(header: string | undefined) {
  return header ? `"${header}"` : "mapeada";
}

export const supportedAliases = columnAliases;

const requiredFields: InternalMetricField[] = ["date", "reach"];
const optionalFields: InternalMetricField[] = ["format", "theme", "likes", "comments", "saves", "shares"];
