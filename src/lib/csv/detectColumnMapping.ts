import {
  normalizedColumnAliases,
  requiredMetricFields,
  type InternalMetricField,
} from "@/lib/csv/columnAliases";
import { normalizeHeader } from "@/lib/csv/normalizeHeader";

export type ColumnMapping = Partial<Record<InternalMetricField, string>>;

export type DetectedColumnMapping = {
  mapping: ColumnMapping;
  missingRequiredFields: InternalMetricField[];
  missingOptionalFields: InternalMetricField[];
};

// We score headers using exact alias match first, then substring similarity.
export function detectColumnMapping(headers: string[]): DetectedColumnMapping {
  const availableHeaders = headers.map((original) => ({
    original,
    normalized: normalizeHeader(original),
  }));

  const usedHeaders = new Set<string>();
  const mapping: ColumnMapping = {};

  for (const [field, aliases] of Object.entries(normalizedColumnAliases) as Array<
    [InternalMetricField, string[]]
  >) {
    let bestMatch: { header: string; score: number } | null = null;

    for (const header of availableHeaders) {
      if (usedHeaders.has(header.original)) {
        continue;
      }

      const score = getHeaderScore(header.normalized, aliases);

      if (score === 0) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          header: header.original,
          score,
        };
      }
    }

    if (bestMatch) {
      mapping[field] = bestMatch.header;
      usedHeaders.add(bestMatch.header);
    }
  }

  const fields = Object.keys(normalizedColumnAliases) as InternalMetricField[];
  const missingRequiredFields = requiredMetricFields.filter((field) => !mapping[field]);
  const missingOptionalFields = fields.filter(
    (field) => !requiredMetricFields.includes(field) && !mapping[field],
  );

  return {
    mapping,
    missingRequiredFields,
    missingOptionalFields,
  };
}

function getHeaderScore(header: string, aliases: string[]) {
  let bestScore = 0;

  for (const alias of aliases) {
    if (header === alias) {
      return 100;
    }

    if (header.includes(alias) || alias.includes(header)) {
      bestScore = Math.max(bestScore, 70);
    }

    // Meta exports often use publication timestamp headers that should outrank
    // generic "date" labels such as a breakdown column named just "Data".
    if (
      alias.includes("public") &&
      (header.includes("public") || header.includes("horario"))
    ) {
      bestScore = Math.max(bestScore, 95);
    }
  }

  return bestScore;
}
