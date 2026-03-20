import {
  generateMetricsInsights,
  normalizeMetricsInsights,
} from "@/lib/metrics/metricsInsights";
import { getCurrentUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { analyzeMetrics, normalizeMetricsSummary } from "@/server/metricsAnalyzer";

type ClientRecord = {
  id: string;
  name: string;
  segment: string;
  notes: string | null;
  brandContext: string | null;
  aiGuidelines: string | null;
  isActive: boolean;
  _count: {
    weeklyAnalyses: number;
  };
};

type AnalysisRecord = {
  id: string;
  date: Date;
  insights: string;
  objective: string;
  metricsSummary: unknown;
  metricsInsights: unknown;
  client: {
    id: string;
    name: string;
    segment: string;
    notes: string | null;
    brandContext: string | null;
    aiGuidelines: string | null;
  };
  metrics: Array<{
    id: string;
    date: Date;
    format: string;
    theme: string;
    reach: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
  }>;
  generatedTopics: Array<{
    id: string;
    title: string;
    format: string;
    objective: string;
    description: string;
    caption: string;
    headline: string | null;
    subheadline: string | null;
    visualScript: unknown;
    visualIdea: string;
    cta: string;
    createdAt: Date;
  }>;
};

export async function getClients(options?: { includeInactive?: boolean }) {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  return prisma.client.findMany({
    where: {
      ...(options?.includeInactive ? {} : { isActive: true }),
      ...(user.role === "admin"
        ? {}
        : {
            id: {
              in: user.clientIds.length > 0 ? user.clientIds : ["__no_client_access__"],
            },
          }),
    },
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          weeklyAnalyses: true,
        },
      },
    },
  }) as Promise<ClientRecord[]>;
}

export async function getClientsForManagement() {
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  return prisma.client.findMany({
    where:
      user.role === "admin"
        ? undefined
        : {
            id: {
              in: user.clientIds.length > 0 ? user.clientIds : ["__no_client_access__"],
            },
          },
    orderBy: [
      {
        isActive: "desc",
      },
      {
        name: "asc",
      },
    ],
    include: {
      _count: {
        select: {
          weeklyAnalyses: true,
        },
      },
    },
  }) as Promise<ClientRecord[]>;
}

export async function getDashboardData() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      stats: {
        clientsCount: 0,
        analysesCount: 0,
        topicsCount: 0,
      },
      latestAnalyses: [],
    };
  }

  const whereClientAccess =
    user.role === "admin"
      ? {}
      : {
          clientId: {
            in: user.clientIds.length > 0 ? user.clientIds : ["__no_client_access__"],
          },
        };

  const [clientsCount, analysesCount, latestAnalyses] = await Promise.all([
    prisma.client.count({
      where: {
        isActive: true,
        ...(user.role === "admin"
          ? {}
          : {
              id: {
                in: user.clientIds.length > 0 ? user.clientIds : ["__no_client_access__"],
              },
            }),
      },
    }),
    prisma.weeklyAnalysis.count({
      where: whereClientAccess,
    }),
    prisma.weeklyAnalysis.findMany({
      where: whereClientAccess,
      orderBy: {
        date: "desc",
      },
      take: 5,
      include: {
        client: true,
        metrics: true,
        generatedTopics: true,
      },
    }),
  ]);

  return {
    stats: {
      clientsCount,
      analysesCount,
      topicsCount: (latestAnalyses as AnalysisRecord[]).reduce(
        (acc: number, item: AnalysisRecord) => acc + item.generatedTopics.length,
        0,
      ),
    },
    latestAnalyses: (latestAnalyses as AnalysisRecord[]).map((analysis) => ({
      ...analysis,
      summary:
        normalizeMetricsSummary(analysis.metricsSummary) ?? analyzeMetrics(analysis.metrics),
      metricsInsights:
        normalizeMetricsInsights(analysis.metricsInsights) ??
        generateMetricsInsights(analysis.metrics),
    })),
  };
}

export async function getAnalysisById(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const analysis = await prisma.weeklyAnalysis.findFirst({
    where: {
      id,
      ...(user.role === "admin"
        ? {}
        : {
            clientId: {
              in: user.clientIds.length > 0 ? user.clientIds : ["__no_client_access__"],
            },
          }),
    },
    include: {
      client: true,
      metrics: {
        orderBy: {
          date: "desc",
        },
      },
      generatedTopics: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!analysis) {
    return null;
  }

  return {
    ...analysis,
    generatedTopics: (analysis as AnalysisRecord).generatedTopics.map((topic) => ({
      ...topic,
      headline: topic.headline,
      subheadline: topic.subheadline,
      visualScript: normalizeVisualScript(topic.visualScript, topic.format),
    })),
    summary:
      normalizeMetricsSummary((analysis as AnalysisRecord).metricsSummary) ??
      analyzeMetrics((analysis as AnalysisRecord).metrics),
    metricsInsights:
      normalizeMetricsInsights((analysis as AnalysisRecord).metricsInsights) ??
      generateMetricsInsights((analysis as AnalysisRecord).metrics),
  };
}

export async function getUsersForAdmin() {
  return prisma.user.findMany({
    orderBy: [
      {
        role: "asc",
      },
      {
        name: "asc",
      },
    ],
    include: {
      userClients: {
        select: {
          clientId: true,
        },
      },
    },
  });
}

function normalizeVisualScript(value: unknown, format: string) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  const label = format.toLowerCase().includes("story")
    ? "Frame"
    : format.toLowerCase().includes("carrossel") || format.toLowerCase().includes("carousel")
      ? "Slide"
      : format.toLowerCase().includes("image") || format.toLowerCase().includes("imagem")
        ? "Composição"
        : "Cena";

  return [
    `${label} 1: Abertura com a mensagem principal`,
    `${label} 2: Desenvolvimento visual do argumento`,
    `${label} 3: Fechamento com CTA`,
  ];
}
