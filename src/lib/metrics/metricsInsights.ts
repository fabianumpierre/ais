import { z } from "zod";

const postMetricSchema = z.object({
  format: z.string(),
  theme: z.string(),
  reach: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
});

const formatDistributionSchema = z.object({
  carousel: z.number().int().nonnegative(),
  image: z.number().int().nonnegative(),
  reel: z.number().int().nonnegative(),
  story: z.number().int().nonnegative(),
  video: z.number().int().nonnegative(),
});

export const metricsInsightsSchema = z.object({
  bestFormat: z.string().nullable(),
  bestFormatEngagement: z.string().nullable(),
  mostCommentedTheme: z.string().nullable(),
  mostSavedTheme: z.string().nullable(),
  bestPostTheme: z.string().nullable(),
  averageEngagementRate: z.string().nullable(),
  formatDistribution: formatDistributionSchema,
  insights: z.array(z.string()).min(0).max(5),
});

export type MetricsInsightInput = z.infer<typeof postMetricSchema>;
export type MetricsInsights = z.infer<typeof metricsInsightsSchema>;

// This engine turns raw post metrics into reusable strategy signals.
// The derived values are intentionally simple so we can expand them later
// without breaking the storage/UI contract.
export function generateMetricsInsights(posts: MetricsInsightInput[]): MetricsInsights {
  const parsedPosts = z.array(postMetricSchema).parse(posts);

  if (parsedPosts.length === 0) {
    return {
      bestFormat: null,
      bestFormatEngagement: null,
      mostCommentedTheme: null,
      mostSavedTheme: null,
      bestPostTheme: null,
      averageEngagementRate: null,
      formatDistribution: {
        carousel: 0,
        image: 0,
        reel: 0,
        story: 0,
        video: 0,
      },
      insights: [],
    };
  }

  const totalReach = parsedPosts.reduce((acc, post) => acc + post.reach, 0);
  const totalEngagement = parsedPosts.reduce((acc, post) => acc + getEngagement(post), 0);

  const averageEngagementRate =
    totalReach > 0 ? `${((totalEngagement / totalReach) * 100).toFixed(1)}%` : null;

  const formatDistribution = parsedPosts.reduce(
    (acc, post) => {
      const normalized = normalizeFormat(post.format);
      acc[normalized] += 1;
      return acc;
    },
    {
      carousel: 0,
      image: 0,
      reel: 0,
      story: 0,
      video: 0,
    },
  );

  const formatPerformance = aggregateBy(parsedPosts, (post) => normalizeFormat(post.format), (post) => ({
    engagement: getEngagement(post),
    reach: post.reach,
    comments: post.comments,
    saves: post.saves,
    posts: 1,
  }));

  const themePerformance = aggregateBy(parsedPosts, (post) => post.theme, (post) => ({
    engagement: getEngagement(post),
    reach: post.reach,
    comments: post.comments,
    saves: post.saves,
    posts: 1,
  }));

  const bestFormatByAverageEngagement = getTopEntry(
    formatPerformance,
    (value) => value.engagement / value.posts,
  );
  const mostCommentedTheme = getTopEntry(themePerformance, (value) => value.comments);
  const mostSavedTheme = getTopEntry(themePerformance, (value) => value.saves);
  const highestReachTheme = getTopEntry(themePerformance, (value) => value.reach);

  const bestPost = parsedPosts
    .map((post) => ({
      ...post,
      engagementRate: post.reach > 0 ? getEngagement(post) / post.reach : 0,
    }))
    .sort((a, b) => b.engagementRate - a.engagementRate)[0];

  const insights = buildHumanInsights({
    formatPerformance,
    bestFormatByAverageEngagement,
    mostCommentedTheme,
    mostSavedTheme,
    highestReachTheme,
  });
  const bestFormatEngagement =
    bestFormatByAverageEngagement &&
    bestFormatByAverageEngagement.value.posts > 0 &&
    bestFormatByAverageEngagement.value.reach > 0
      ? `${(
          (bestFormatByAverageEngagement.value.engagement /
            bestFormatByAverageEngagement.value.reach) *
          100
        ).toFixed(1)}%`
      : null;

  return {
    bestFormat: bestFormatByAverageEngagement?.key ?? null,
    bestFormatEngagement,
    mostCommentedTheme: mostCommentedTheme?.key ?? null,
    mostSavedTheme: mostSavedTheme?.key ?? null,
    bestPostTheme: bestPost?.theme ?? null,
    averageEngagementRate,
    formatDistribution,
    insights,
  };
}

export function normalizeMetricsInsights(value: unknown): MetricsInsights | null {
  const parsed = metricsInsightsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getEngagement(post: MetricsInsightInput) {
  return post.likes + post.comments + post.saves + post.shares;
}

function normalizeFormat(format: string) {
  const normalized = format.trim().toLowerCase();

  if (normalized.includes("carrossel") || normalized.includes("carousel")) {
    return "carousel" as const;
  }

  if (normalized.includes("story")) {
    return "story" as const;
  }

  if (normalized.includes("reel")) {
    return "reel" as const;
  }

  if (normalized.includes("video")) {
    return "video" as const;
  }

  return "image" as const;
}

function aggregateBy<T extends string>(
  posts: MetricsInsightInput[],
  keySelector: (post: MetricsInsightInput) => T,
  valueSelector: (post: MetricsInsightInput) => {
    engagement: number;
    reach: number;
    comments: number;
    saves: number;
    posts: number;
  },
) {
  return posts.reduce<Map<T, ReturnType<typeof valueSelector>>>((acc, post) => {
    const key = keySelector(post);
    const next = valueSelector(post);
    const current = acc.get(key);

    if (!current) {
      acc.set(key, next);
      return acc;
    }

    acc.set(key, {
      engagement: current.engagement + next.engagement,
      reach: current.reach + next.reach,
      comments: current.comments + next.comments,
      saves: current.saves + next.saves,
      posts: current.posts + next.posts,
    });

    return acc;
  }, new Map());
}

function getTopEntry<T extends string>(
  map: Map<T, { engagement: number; reach: number; comments: number; saves: number; posts: number }>,
  scorer: (value: { engagement: number; reach: number; comments: number; saves: number; posts: number }) => number,
) {
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value, score: scorer(value) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))[0] ?? null;
}

function buildHumanInsights(input: {
  formatPerformance: Map<string, { engagement: number; reach: number; comments: number; saves: number; posts: number }>;
  bestFormatByAverageEngagement: {
    key: string;
    value: { engagement: number; reach: number; comments: number; saves: number; posts: number };
    score: number;
  } | null;
  mostCommentedTheme: {
    key: string;
    value: { engagement: number; reach: number; comments: number; saves: number; posts: number };
    score: number;
  } | null;
  mostSavedTheme: {
    key: string;
    value: { engagement: number; reach: number; comments: number; saves: number; posts: number };
    score: number;
  } | null;
  highestReachTheme: {
    key: string;
    value: { engagement: number; reach: number; comments: number; saves: number; posts: number };
    score: number;
  } | null;
}) {
  const insights: string[] = [];

  if (input.bestFormatByAverageEngagement) {
    insights.push(
      `${capitalize(input.bestFormatByAverageEngagement.key)} teve o melhor engajamento medio entre os formatos analisados.`,
    );
  }

  if (input.mostSavedTheme) {
    insights.push(
      `Conteudos sobre "${truncate(input.mostSavedTheme.key)}" geraram mais salvamentos que os demais temas.`,
    );
  }

  if (input.mostCommentedTheme) {
    insights.push(
      `O tema "${truncate(input.mostCommentedTheme.key)}" concentrou o maior volume de comentarios.`,
    );
  }

  if (input.highestReachTheme) {
    insights.push(
      `Posts sobre "${truncate(input.highestReachTheme.key)}" tiveram o maior alcance acumulado da semana.`,
    );
  }

  const reels = input.formatPerformance.get("reel");
  const carousel = input.formatPerformance.get("carousel");

  if (reels && carousel) {
    const reelAvgReach = reels.reach / reels.posts;
    const carouselAvgReach = carousel.reach / carousel.posts;

    if (reelAvgReach > carouselAvgReach) {
      insights.push("Reels tiveram maior alcance medio do que carrosseis nesta amostra.");
    }
  }

  return insights.slice(0, 5);
}

function truncate(value: string, maxLength = 60) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
