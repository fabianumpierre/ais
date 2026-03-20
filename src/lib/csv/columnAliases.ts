import { normalizeHeader } from "@/lib/csv/normalizeHeader";

export const columnAliases = {
  date: [
    "date",
    "data",
    "post date",
    "data de publicacao",
    "horario de publicacao",
    "hora da publicacao",
    "horario da publicacao",
    "published date",
    "published time",
    "publication time",
    "created time",
    "post time",
    "publication date",
    "publish date",
    "posted on",
  ],
  format: [
    "format",
    "tipo",
    "post type",
    "media type",
    "tipo de post",
    "tipo de publicacao",
    "content type",
    "formato",
  ],
  theme: [
    "caption",
    "texto",
    "post message",
    "descricao",
    "descricao do post",
    "description",
    "mensagem",
    "legenda",
    "copy",
    "content",
  ],
  reach: [
    "reach",
    "alcance",
    "total reach",
    "impressions",
    "alcance total",
    "impressoes",
    "views",
    "visualizacoes",
  ],
  likes: [
    "likes",
    "curtidas",
    "reactions",
    "like count",
    "total de curtidas",
    "reacoes",
    "total likes",
  ],
  comments: [
    "comments",
    "comentarios",
    "comment count",
    "total comments",
    "total de comentarios",
  ],
  saves: [
    "saves",
    "salvamentos",
    "bookmarks",
    "saved",
    "total saves",
    "total de salvamentos",
  ],
  shares: [
    "shares",
    "compartilhamentos",
    "share count",
    "total shares",
    "total de compartilhamentos",
    "reposts",
  ],
} as const;

export const normalizedColumnAliases = Object.fromEntries(
  Object.entries(columnAliases).map(([field, aliases]) => [
    field,
    aliases.map((alias) => normalizeHeader(alias)),
  ]),
) as {
  [K in keyof typeof columnAliases]: string[];
};

export type InternalMetricField = keyof typeof columnAliases;

export const requiredMetricFields: InternalMetricField[] = ["date", "reach"];

export const metricFieldLabels: Record<InternalMetricField, string> = {
  date: "Date",
  format: "Format",
  theme: "Theme",
  reach: "Reach",
  likes: "Likes",
  comments: "Comments",
  saves: "Saves",
  shares: "Shares",
};
