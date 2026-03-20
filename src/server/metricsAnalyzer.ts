import { z } from "zod";

const metricInputSchema = z.object({
  format: z.string(),
  theme: z.string(),
  reach: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
});

export const metricsSummarySchema = z.object({
  totalPosts: z.number().int().nonnegative(),
  totalReach: z.number().int().nonnegative(),
  avgEngagement: z.number().nonnegative(),
  bestFormat: z.string().nullable(),
  bestFormatByEngagement: z.string().nullable(),
  mostCommentedTheme: z.string().nullable(),
  mostSavedTheme: z.string().nullable(),
  mostEngagingTheme: z.string().nullable(),
});

export type MetricsAnalyzerInput = z.infer<typeof metricInputSchema>;
export type MetricsSummary = z.infer<typeof metricsSummarySchema>;

function getEngagement(metric: MetricsAnalyzerInput) {
  return metric.likes + metric.comments + metric.saves + metric.shares;
}

export function analyzeMetrics(metrics: MetricsAnalyzerInput[]): MetricsSummary {
  const parsedMetrics = z.array(metricInputSchema).parse(metrics);

  if (parsedMetrics.length === 0) {
    return {
      totalPosts: 0,
      totalReach: 0,
      avgEngagement: 0,
      bestFormat: null,
      bestFormatByEngagement: null,
      mostCommentedTheme: null,
      mostSavedTheme: null,
      mostEngagingTheme: null,
    };
  }

  const totalPosts = parsedMetrics.length;
  const totalReach = parsedMetrics.reduce((acc, metric) => acc + metric.reach, 0);
  const avgEngagement = Math.round(
    parsedMetrics.reduce((acc, metric) => acc + getEngagement(metric), 0) / totalPosts,
  );

  const formatCount = new Map<string, number>();
  const formatEngagement = new Map<string, { total: number; posts: number }>();
  const themeComments = new Map<string, number>();
  const themeSaves = new Map<string, number>();
  const themeEngagement = new Map<string, number>();

  for (const metric of parsedMetrics) {
    formatCount.set(metric.format, (formatCount.get(metric.format) ?? 0) + 1);

    const formatStats = formatEngagement.get(metric.format) ?? { total: 0, posts: 0 };
    formatStats.total += getEngagement(metric);
    formatStats.posts += 1;
    formatEngagement.set(metric.format, formatStats);

    themeComments.set(metric.theme, (themeComments.get(metric.theme) ?? 0) + metric.comments);
    themeSaves.set(metric.theme, (themeSaves.get(metric.theme) ?? 0) + metric.saves);
    themeEngagement.set(metric.theme, (themeEngagement.get(metric.theme) ?? 0) + getEngagement(metric));
  }

  return {
    totalPosts,
    totalReach,
    avgEngagement,
    bestFormat: getTopKey(formatCount),
    bestFormatByEngagement: getTopKey(
      new Map(
        Array.from(formatEngagement.entries()).map(([format, stats]) => [
          format,
          stats.posts > 0 ? stats.total / stats.posts : 0,
        ]),
      ),
    ),
    mostCommentedTheme: getTopKey(themeComments),
    mostSavedTheme: getTopKey(themeSaves),
    mostEngagingTheme: getTopKey(themeEngagement),
  };
}

function getTopKey(map: Map<string, number>) {
  const sorted = Array.from(map.entries()).sort((a, b) => {
    if (b[1] === a[1]) {
      return a[0].localeCompare(b[0]);
    }

    return b[1] - a[1];
  });

  return sorted[0]?.[0] ?? null;
}

export function normalizeMetricsSummary(value: unknown): MetricsSummary | null {
  const parsed = metricsSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
