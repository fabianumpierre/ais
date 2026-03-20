type MetricInput = {
  format: string;
  theme: string;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

export function calculateMetricsSummary(metrics: MetricInput[]) {
  const totals = metrics.reduce(
    (acc, item) => {
      acc.posts += 1;
      acc.reach += item.reach;
      acc.likes += item.likes;
      acc.comments += item.comments;
      acc.saves += item.saves;
      acc.shares += item.shares;
      return acc;
    },
    { posts: 0, reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 },
  );

  const byFormat = Object.entries(
    metrics.reduce<Record<string, number>>((acc, item) => {
      acc[item.format] = (acc[item.format] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([format, count]) => ({ format, count }));

  const byTheme = Object.entries(
    metrics.reduce<Record<string, number>>((acc, item) => {
      const engagement = item.likes + item.comments + item.saves + item.shares;
      acc[item.theme] = (acc[item.theme] ?? 0) + engagement;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([theme, engagement]) => ({ theme, engagement }));

  const averageEngagement =
    totals.posts > 0
      ? Math.round(
          (totals.likes + totals.comments + totals.saves + totals.shares) / totals.posts,
        )
      : 0;

  return {
    totals,
    averageEngagement,
    topFormat: byFormat[0] ?? null,
    topTheme: byTheme[0] ?? null,
    byFormat,
    byTheme,
  };
}
