import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/serviceError";

export async function enforceAiGenerationLimits(analysisId: string) {
  const { dailyGenerations, analysisGenerations } = await getAiUsageCounts(analysisId);

  if ((analysisGenerations ?? 0) >= 1) {
    throw new ServiceError("Esta analise ja utilizou a geracao de IA.", 429);
  }

  enforceDailyAiGenerationLimitFromCount(dailyGenerations);
}

export async function enforceDailyAiGenerationLimit() {
  const { dailyGenerations } = await getAiUsageCounts();
  enforceDailyAiGenerationLimitFromCount(dailyGenerations);
}

async function getAiUsageCounts(analysisId?: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [analysisGenerations, dailyGenerations] = await Promise.all([
    analysisId
      ? prisma.aiUsage.count({
          where: {
            analysisId,
          },
        })
      : Promise.resolve<number | null>(null),
    prisma.aiUsage.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    }),
  ]);

  return {
    analysisGenerations,
    dailyGenerations,
  };
}

function enforceDailyAiGenerationLimitFromCount(dailyGenerations: number) {
  if (dailyGenerations >= 20) {
    throw new ServiceError("Limite diario de 20 geracoes de IA atingido. Tente novamente amanha.", 429);
  }
}
