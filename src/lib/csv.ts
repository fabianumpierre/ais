import { parse } from "csv-parse/sync";
import { z } from "zod";

const csvRowSchema = z.object({
  date: z.string().min(1),
  format: z.string().min(1),
  theme: z.string().min(1),
  reach: z.coerce.number().int().nonnegative(),
  likes: z.coerce.number().int().nonnegative(),
  comments: z.coerce.number().int().nonnegative(),
  saves: z.coerce.number().int().nonnegative(),
  shares: z.coerce.number().int().nonnegative(),
});

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function detectDelimiter(csvContent: string) {
  const firstLine = csvContent.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function parseDate(value: string) {
  const trimmed = value.trim();
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!slashMatch) {
    const fallback = new Date(trimmed);
    if (Number.isNaN(fallback.getTime())) {
      throw new Error(`Data invalida no CSV: "${value}".`);
    }
    return fallback;
  }

  const first = Number(slashMatch[1]);
  const second = Number(slashMatch[2]);
  const year = Number(slashMatch[3]);

  const isDayFirst = first > 12;
  const month = isDayFirst ? second : first;
  const day = isDayFirst ? first : second;
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data invalida no CSV: "${value}".`);
  }

  return parsed;
}

export function parseMetricsCsv(csvContent: string) {
  const delimiter = detectDelimiter(csvContent);
  const rows = parse(csvContent, {
    bom: true,
    columns: (headers: string[]) => headers.map(normalizeHeader),
    delimiter,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  }) as Record<string, string>[];

  return rows.map((row, index) => {
    const parsed = csvRowSchema.safeParse(row);

    if (!parsed.success) {
      throw new Error(`Linha ${index + 2} do CSV invalida.`);
    }

    return {
      ...parsed.data,
      date: parseDate(parsed.data.date),
    };
  });
}
