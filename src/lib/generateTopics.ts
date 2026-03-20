import { z } from "zod";

import {
  enforceAiGenerationLimits,
  enforceDailyAiGenerationLimit,
} from "@/lib/aiRateLimiter";
import {
  generateMetricsInsights,
  normalizeMetricsInsights,
  type MetricsInsights,
} from "@/lib/metrics/metricsInsights";
import { getOpenAIClient, TOPIC_GENERATION_MODEL } from "@/lib/openaiClient";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/serviceError";
import { analyzeMetrics, normalizeMetricsSummary, type MetricsSummary } from "@/server/metricsAnalyzer";
import {
  persistMetricsInsights,
  persistMetricsSummary,
} from "@/server/weeklyAnalysisRepository";

const topicSchema = z.object({
  title: z.string().min(3),
  objective: z.enum(["engagement", "education", "conversion"]),
  format: z.enum(["carousel", "reel", "image", "story"]),
  description: z.string().min(10),
  caption: z.string().min(20).max(1200),
  reasoning: z.string().min(20).max(240),
  headline: z.string().min(3).max(60),
  subheadline: z.string().max(90).optional().nullable(),
  visualScript: z.array(z.string().min(5)).min(1).max(8),
  visualIdea: z.string().min(10),
  cta: z.string().min(3),
});

const topicsResponseSchema = z.object({
  topics: z.array(topicSchema).length(9),
});

const singleTopicResponseSchema = z.object({
  topic: topicSchema,
});

type TopicCandidate = z.infer<typeof topicSchema>;

const GROUNDING_STOP_WORDS = new Set([
  "sobre",
  "para",
  "entre",
  "desta",
  "deste",
  "semana",
  "marca",
  "cliente",
  "diretrizes",
  "insights",
  "metricas",
  "analysis",
  "posts",
  "there",
  "based",
  "principalmente",
]);

const META_COPY_PHRASES = [
  "a ideia aqui é",
  "a proposta aqui é",
  "neste post",
  "este post deve",
  "este conteúdo deve",
  "a proposta deste conteúdo",
  "use este conteúdo",
  "o foco aqui é",
  "a ideia é",
  "vale usar",
  "vale aproveitar",
  "neste reel",
  "este conteúdo",
];

export type GeneratedTopicPayload = {
  title: string;
  objective: "engagement" | "education" | "conversion";
  format: "carousel" | "reel" | "image" | "story";
  description: string;
  caption: string;
  headline: string;
  subheadline: string | null;
  visualScript: string[];
  visualIdea: string;
  cta: string;
};

type AnalysisWithContext = NonNullable<
  {
    id: string;
    insights: string;
    metricsSummary: unknown;
    metricsInsights: unknown;
    client: {
      name: string;
      segment: string;
      brandContext: string | null;
      aiGuidelines: string | null;
    };
    metrics: Array<{
      date: Date;
      format: string;
      theme: string;
      reach: number;
      likes: number;
      comments: number;
      saves: number;
      shares: number;
    }>;
  }
>;

export async function generateTopicsForAnalysis(analysisId: string) {
  const analysis = await prisma.weeklyAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      client: true,
      metrics: true,
      generatedTopics: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!analysis) {
    throw new ServiceError("Análise não encontrada.", 404);
  }

  if (analysis.generatedTopics.length > 0) {
    return {
      topics: analysis.generatedTopics.map(normalizeStoredTopic),
      source: "existing" as const,
      usedOpenAI: false,
    };
  }

  const context = await getAnalysisGenerationContext(analysis);

  if (!process.env.OPENAI_API_KEY) {
    const fallbackTopics = createFallbackTopics(context);

    await saveTopics(analysisId, fallbackTopics);

    return {
      topics: fallbackTopics,
      source: "fallback" as const,
      usedOpenAI: false,
    };
  }

  await enforceAiGenerationLimits(analysisId);

  const openai = getOpenAIClient();

  if (!openai) {
    throw new ServiceError("OPENAI_API_KEY não configurada.", 500);
  }

  try {
    const generatedTopics = await generateGroundedTopicsWithRetry({
      analysisId,
      context,
      openai,
    });
    const topics = generatedTopics ?? createFallbackTopics(context);

    await saveTopics(analysisId, topics);

    return {
      topics,
      source: generatedTopics ? ("openai" as const) : ("fallback_invalid_json" as const),
      usedOpenAI: true,
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    await prisma.aiUsage.create({
      data: {
        analysisId,
        model: TOPIC_GENERATION_MODEL,
        tokensUsed: null,
      },
    });

    throw mapOpenAiError(error);
  }
}

export async function regenerateTopicById(topicId: string) {
  const topic = await prisma.generatedTopic.findUnique({
    where: { id: topicId },
    include: {
      analysis: {
        include: {
          client: true,
          metrics: true,
        },
      },
    },
  });

  if (!topic) {
    throw new ServiceError("Post não encontrado.", 404);
  }

  const context = await getAnalysisGenerationContext(topic.analysis as AnalysisWithContext);
  const fallbackTopic = createSingleFallbackTopic({
    currentTopic: normalizeStoredTopic(topic),
    context,
  });

  if (!process.env.OPENAI_API_KEY) {
    const updated = await prisma.generatedTopic.update({
      where: { id: topicId },
      data: serializeTopicForDatabase(fallbackTopic),
    });

    return {
      topic: normalizeStoredTopic(updated),
      source: "fallback" as const,
    };
  }

  await enforceDailyAiGenerationLimit();

  const openai = getOpenAIClient();

  if (!openai) {
    throw new ServiceError("OPENAI_API_KEY não configurada.", 500);
  }

  try {
    const regeneratedTopic = await regenerateGroundedTopicWithRetry({
      analysisId: topic.analysisId,
      currentTopic: normalizeStoredTopic(topic),
      context,
      openai,
    });
    const nextTopic = regeneratedTopic ?? fallbackTopic;

    const updated = await prisma.generatedTopic.update({
      where: { id: topicId },
      data: serializeTopicForDatabase(nextTopic),
    });

    return {
      topic: normalizeStoredTopic(updated),
      source: regeneratedTopic ? ("openai" as const) : ("fallback_invalid_json" as const),
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    await prisma.aiUsage.create({
      data: {
        analysisId: topic.analysisId,
        model: TOPIC_GENERATION_MODEL,
        tokensUsed: null,
      },
    });

    throw mapOpenAiError(error);
  }
}

async function getAnalysisGenerationContext(analysis: AnalysisWithContext) {
  const metricsSummary =
    normalizeMetricsSummary(analysis.metricsSummary) ?? analyzeMetrics(analysis.metrics);
  const metricsInsights =
    normalizeMetricsInsights(analysis.metricsInsights) ??
    generateMetricsInsights(analysis.metrics);

  await persistMetricsSummary(analysis.id, metricsSummary);
  await persistMetricsInsights(analysis.id, metricsInsights);

  return {
    analysisId: analysis.id,
    clientName: analysis.client.name,
    clientSegment: analysis.client.segment,
    clientProfile: analysis.client.brandContext,
    clientGuidelines: analysis.client.aiGuidelines,
    insights: analysis.insights,
    metricsSummary,
    metricsInsights,
  };
}

async function requestTopicsGeneration(input: {
  analysisId: string;
  openai: NonNullable<ReturnType<typeof getOpenAIClient>>;
  prompt: string;
}) {
  const completion = await input.openai.chat.completions.create({
    model: TOPIC_GENERATION_MODEL,
    temperature: 0.7,
    max_tokens: 2200,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You are a senior social media strategist. You must create highly contextual content based on real data, not generic ideas.",
      },
      {
        role: "user",
        content: input.prompt,
      },
    ],
  });

  await prisma.aiUsage.create({
    data: {
      analysisId: input.analysisId,
      model: TOPIC_GENERATION_MODEL,
      tokensUsed: completion.usage?.total_tokens ?? null,
    },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ServiceError("A IA não retornou conteúdo. Tente novamente.", 502);
  }

  return parseTopicsResponse(content);
}

async function requestSingleTopicGeneration(input: {
  analysisId: string;
  openai: NonNullable<ReturnType<typeof getOpenAIClient>>;
  prompt: string;
}) {
  const completion = await input.openai.chat.completions.create({
    model: TOPIC_GENERATION_MODEL,
    temperature: 0.8,
    max_tokens: 700,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You are a senior social media strategist. You must create highly contextual content based on real data, not generic ideas.",
      },
      {
        role: "user",
        content: input.prompt,
      },
    ],
  });

  await prisma.aiUsage.create({
    data: {
      analysisId: input.analysisId,
      model: TOPIC_GENERATION_MODEL,
      tokensUsed: completion.usage?.total_tokens ?? null,
    },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ServiceError("A IA não retornou conteúdo. Tente novamente.", 502);
  }

  return parseSingleTopicResponse(content);
}

function validateGroundedTopics(
  topics: TopicCandidate[],
  context: Awaited<ReturnType<typeof getAnalysisGenerationContext>>,
) {
  const weeklyKeywords = extractGroundingKeywords(context.insights);
  const metricsKeywords = extractGroundingKeywords(buildMetricsInsightsContext(context.metricsSummary, context.metricsInsights));
  const genericPhrases = [
    "engage your audience",
    "boost your brand",
    "connect with your audience",
  ];

  let weeklyGroundedCount = 0;

  for (const topic of topics) {
    const reasoning = topic.reasoning.toLowerCase();
    const combinedText = [
      topic.title,
      topic.description,
      topic.caption,
      topic.reasoning,
      topic.headline,
      topic.subheadline ?? "",
    ]
      .join(" ")
      .toLowerCase();

    const hasWeeklyGrounding = weeklyKeywords.some((keyword) => combinedText.includes(keyword));
    const hasMetricsGrounding = metricsKeywords.some((keyword) => combinedText.includes(keyword));

    if (hasWeeklyGrounding) {
      weeklyGroundedCount += 1;
    }

    if (!hasWeeklyGrounding && !hasMetricsGrounding) {
      return {
        valid: false,
        reason: `The topic "${topic.title}" does not reference any weekly or metrics insight clearly enough.`,
      };
    }

    if (genericPhrases.some((phrase) => combinedText.includes(phrase))) {
      return {
        valid: false,
        reason: `The topic "${topic.title}" uses a banned generic phrase and must be rewritten.`,
      };
    }

    if (META_COPY_PHRASES.some((phrase) => topic.caption.toLowerCase().includes(phrase))) {
      return {
        valid: false,
        reason: `The caption for "${topic.title}" is still strategic/meta text instead of publish-ready copy.`,
      };
    }

    if (!reasoning.includes("insight") && !reasoning.includes("métrica") && !reasoning.includes("metric")) {
      return {
        valid: false,
        reason: `The topic "${topic.title}" is missing explicit reasoning about the insight or chosen format.`,
      };
    }
  }

  if (weeklyGroundedCount < 3 && topics.length > 1) {
    return {
      valid: false,
      reason: "At least 3 topics must directly reflect the weekly insights.",
    };
  }

  return {
    valid: true,
  };
}

function extractGroundingKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 5)
        .filter((token) => !GROUNDING_STOP_WORDS.has(token)),
    ),
  );
}

async function generateGroundedTopicsWithRetry(input: {
  analysisId: string;
  context: Awaited<ReturnType<typeof getAnalysisGenerationContext>>;
  openai: NonNullable<ReturnType<typeof getOpenAIClient>>;
}) {
  let feedback: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await requestTopicsGeneration({
      analysisId: input.analysisId,
      openai: input.openai,
      prompt: buildTopicsPrompt(input.context, feedback),
    });

    if (!response) {
      feedback = "The response was missing or invalid JSON. Regenerate with stronger grounding.";
      continue;
    }

    const validation = validateGroundedTopics(response.topics, input.context);

    if (validation.valid) {
      return response.topics.map(toGeneratedTopicPayload);
    }

    feedback = validation.reason ?? "The output was not grounded enough. Regenerate with stronger context use.";
  }

  return null;
}

async function regenerateGroundedTopicWithRetry(input: {
  analysisId: string;
  currentTopic: GeneratedTopicPayload;
  context: Awaited<ReturnType<typeof getAnalysisGenerationContext>>;
  openai: NonNullable<ReturnType<typeof getOpenAIClient>>;
}) {
  let feedback: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await requestSingleTopicGeneration({
      analysisId: input.analysisId,
      openai: input.openai,
      prompt: buildSingleTopicPrompt(
        {
          currentTopic: input.currentTopic,
          context: input.context,
        },
        feedback,
      ),
    });

    if (!response) {
      feedback = "The response was missing or invalid JSON. Regenerate with stronger grounding.";
      continue;
    }

    const validation = validateGroundedTopics([response.topic], input.context);

    if (validation.valid) {
      return toGeneratedTopicPayload(response.topic);
    }

    feedback = validation.reason ?? "The output was not grounded enough. Regenerate with stronger context use.";
  }

  return null;
}

function buildTopicsPrompt(input: {
  clientName: string;
  clientSegment: string;
  clientProfile: string | null;
  clientGuidelines: string | null;
  insights: string;
  metricsSummary: MetricsSummary;
  metricsInsights: MetricsInsights;
}, feedback: string | null = null) {
  return `
Generate exactly 9 social media posts for next week.
Return only valid JSON in this exact shape:
{
  "topics": [
    {
      "title": "",
      "objective": "engagement | education | conversion",
      "format": "carousel | reel | image | story",
      "description": "",
      "caption": "",
      "reasoning": "",
      "headline": "",
      "subheadline": "",
      "visualScript": ["Step 1"],
      "visualIdea": "",
      "cta": ""
    }
  ]
}

CLIENT
Name: ${input.clientName}
Segment: ${input.clientSegment}

CLIENT PROFILE
${input.clientProfile || "No brand profile provided."}

CLIENT GUIDELINES
${input.clientGuidelines || "No special AI guidelines provided."}

WEEKLY INSIGHTS - PRIORITY
${input.insights}

METRICS INSIGHTS
${buildMetricsInsightsContext(input.metricsSummary, input.metricsInsights)}

CRITICAL RULES:
1. Weekly insights (objectives) are mandatory.
2. At least 3 topics MUST directly reflect weekly insights.
3. Each topic MUST reference either a weekly insight or a metrics insight.
4. Generic content is not allowed.
5. If content becomes generic, regenerate internally with a more specific angle.

QUALITY RULES:
- Respect the client profile and the client guidelines.
- Prioritize the best performing formats and the most engaging themes.
- Balance formats across carousel, reel, image and story.
- Balance objectives across engagement, education and conversion.
- Avoid repetitive angles, hooks or CTAs.
- Write captions in a natural and engaging tone.
- Adapt the tone to the client profile.
- Use emojis when appropriate.
- Keep each caption concise, with a maximum of 120 words.
- Caption must be final copy, ready to publish on social media.
- Do not explain the strategy inside the caption.
- Do not write captions as instructions to the team.
- Do not use meta phrases like "neste post", "a ideia aqui é", "este conteúdo deve" or "a proposta é".
- Make every post actionable and useful for the marketing team.
- The description should explain the strategic idea behind the post.
- Reasoning must briefly explain which insight was used and why the format was chosen.
- You must generate creative direction for designers, including headline, subheadline and visual structure.
- Headline must be short, impactful and have at most 8 words.
- Subheadline is optional, but if used it should complement the headline.
- VisualScript must adapt to the format:
  - carousel: list slides
  - reel: list scenes
  - image: describe one single composition
  - story: list sequential frames
- Avoid generic phrases like:
  - "engage your audience"
  - "boost your brand"
  - "connect with your audience"
${feedback ? `\nRETRY FEEDBACK:\n${feedback}` : ""}
`.trim();
}

function buildSingleTopicPrompt(input: {
  currentTopic: GeneratedTopicPayload;
  context: Awaited<ReturnType<typeof getAnalysisGenerationContext>>;
}, feedback: string | null = null) {
  return `
Regenerate only one social media post for the current weekly plan.
Return only valid JSON in this exact shape:
{
  "topic": {
    "title": "",
    "objective": "engagement | education | conversion",
    "format": "carousel | reel | image | story",
    "description": "",
    "caption": "",
    "reasoning": "",
    "headline": "",
    "subheadline": "",
    "visualScript": ["Step 1"],
    "visualIdea": "",
    "cta": ""
  }
}

CURRENT POST TO IMPROVE
Title: ${input.currentTopic.title}
Format: ${input.currentTopic.format}
Objective: ${input.currentTopic.objective}
Description: ${input.currentTopic.description}
Caption: ${input.currentTopic.caption}
Headline: ${input.currentTopic.headline}
Subheadline: ${input.currentTopic.subheadline || "N/A"}
Visual idea: ${input.currentTopic.visualIdea}
CTA: ${input.currentTopic.cta}
Visual script:
${input.currentTopic.visualScript.map((step) => `- ${step}`).join("\n")}

CLIENT
Name: ${input.context.clientName}
Segment: ${input.context.clientSegment}

CLIENT PROFILE
${input.context.clientProfile || "No brand profile provided."}

CLIENT GUIDELINES
${input.context.clientGuidelines || "No special AI guidelines provided."}

WEEKLY INSIGHTS - PRIORITY
${input.context.insights}

METRICS INSIGHTS
${buildMetricsInsightsContext(input.context.metricsSummary, input.context.metricsInsights)}

Rules:
- Keep the same overall quality level, but bring a fresh angle.
- Weekly insights are mandatory.
- The regenerated topic must reference either a weekly insight or a metrics insight.
- Respect the weekly insights and client brand.
- Avoid generic angles or empty phrases.
- Reasoning must briefly explain which insight was used and why the format was chosen.
- Caption must be final copy, ready to publish on social media.
- Do not explain the strategy inside the caption.
- Do not write captions as instructions to the team.
- Do not use meta phrases like "neste post", "a ideia aqui é", "este conteúdo deve" or "a proposta é".
- You must generate creative direction for designers, including headline, subheadline and visual structure.
- Headline must be short, impactful and have at most 8 words.
- Subheadline is optional, but if used it should complement the headline.
- VisualScript must adapt to the chosen format.
- Caption must stay concise, natural and actionable.
${feedback ? `\nRETRY FEEDBACK:\n${feedback}` : ""}
`.trim();
}

function buildMetricsInsightsContext(metricsSummary: MetricsSummary, metricsInsights: MetricsInsights) {
  if (metricsSummary.totalPosts === 0) {
    return [
      "- Não há métricas importadas para esta análise.",
      "- Baseie a estratégia principalmente nos insights da semana, no perfil do cliente e nas diretrizes da marca.",
      "- Distribua os formatos de forma equilibrada e proponha testes criativos para descobrir o que pode performar melhor.",
    ].join("\n");
  }

  return [
    `- Total posts: ${metricsSummary.totalPosts}`,
    `- Total reach: ${metricsSummary.totalReach}`,
    `- Average engagement: ${metricsSummary.avgEngagement}`,
    `- Best format: ${metricsSummary.bestFormat ?? "N/A"}`,
    `- Best format by engagement: ${metricsSummary.bestFormatByEngagement ?? "N/A"}`,
    `- Most commented theme: ${metricsSummary.mostCommentedTheme ?? "N/A"}`,
    `- Most saved theme: ${metricsSummary.mostSavedTheme ?? "N/A"}`,
    `- Most engaging theme: ${metricsSummary.mostEngagingTheme ?? "N/A"}`,
    ...metricsInsights.insights.map((insight) => `- ${insight}`),
  ].join("\n");
}

function parseTopicsResponse(content: string) {
  try {
    const normalized = extractJsonObject(content);
    const json = JSON.parse(normalized);
    const parsed = topicsResponseSchema.parse(json);

    return {
      topics: parsed.topics,
    };
  } catch {
    return null;
  }
}

function parseSingleTopicResponse(content: string) {
  try {
    const normalized = extractJsonObject(content);
    const json = JSON.parse(normalized);
    const parsed = singleTopicResponseSchema.parse(json);

    return {
      topic: parsed.topic,
    };
  } catch {
    return null;
  }
}

function toGeneratedTopicPayload(topic: TopicCandidate): GeneratedTopicPayload {
  return {
    title: topic.title,
    objective: topic.objective,
    format: topic.format,
    description: topic.description,
    caption: topic.caption,
    headline: topic.headline,
    subheadline: sanitizeOptionalString(topic.subheadline),
    visualScript: topic.visualScript.map((step) => step.trim()).filter(Boolean),
    visualIdea: topic.visualIdea,
    cta: topic.cta,
  };
}

function normalizeStoredTopic(topic: {
  id?: string;
  title: string;
  objective: string;
  format: string;
  description: string;
  caption: string;
  headline: string | null;
  subheadline: string | null;
  visualScript: unknown;
  visualIdea: string;
  cta: string;
}) {
  return {
    ...(topic.id ? { id: topic.id } : {}),
    title: topic.title,
    objective: normalizeObjective(topic.objective),
    format: normalizeFormat(topic.format),
    description: topic.description,
    caption: topic.caption,
    headline: sanitizeOptionalString(topic.headline) ?? topic.title,
    subheadline: sanitizeOptionalString(topic.subheadline),
    visualScript: normalizeVisualScript(topic.visualScript, topic.format),
    visualIdea: topic.visualIdea,
    cta: topic.cta,
  };
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function mapOpenAiError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : "erro interno ao gerar pautas.";
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: number }).status)
    : undefined;

  if (status === 429 && message.includes("quota")) {
    return new ServiceError("A cota da OpenAI foi excedida. Verifique seu plano e tente novamente mais tarde.", 429);
  }

  if (status === 429 || message.includes("rate limit")) {
    return new ServiceError("A OpenAI está com limite temporário de requisições. Tente novamente em instantes.", 429);
  }

  return new ServiceError("Não foi possível gerar pautas com IA no momento.", 502);
}

async function saveTopics(analysisId: string, topics: GeneratedTopicPayload[]) {
  await prisma.$transaction([
    prisma.generatedTopic.deleteMany({
      where: { analysisId },
    }),
    ...topics.map((topic) =>
      prisma.generatedTopic.create({
        data: {
          analysisId,
          ...serializeTopicForDatabase(topic),
        },
      }),
    ),
  ]);
}

function serializeTopicForDatabase(topic: GeneratedTopicPayload) {
  return {
    title: topic.title,
    objective: topic.objective,
    format: topic.format,
    description: topic.description,
    caption: topic.caption,
    headline: topic.headline,
    subheadline: topic.subheadline,
    visualScript: topic.visualScript,
    visualIdea: topic.visualIdea,
    cta: topic.cta,
  };
}

function createFallbackTopics(input: {
  clientName: string;
  clientSegment: string;
  insights: string;
  metricsSummary: MetricsSummary;
  metricsInsights: MetricsInsights;
}): GeneratedTopicPayload[] {
  const bestFormat = normalizeFormat(input.metricsSummary.bestFormat);
  const topFormat = normalizeFormat(input.metricsSummary.bestFormatByEngagement);
  const bestTheme = input.metricsSummary.mostEngagingTheme ?? "bastidores";
  const firstInsight = input.metricsInsights.insights[0] ?? "o principal aprendizado da semana";

  return [
    {
      title: `${input.clientName}: conversa da semana`,
      objective: "engagement",
      format: bestFormat,
      description: `Abrir conversa sobre ${bestTheme}, conectando o tema ao insight "${firstInsight}".`,
      caption: `${bestTheme} tem aparecido com força por aqui, então queremos te ouvir: como esse tema toca a sua rotina hoje? 💬 Conta nos comentários o que mais faz sentido, o que te desafia ou o que você gostaria de ver com mais profundidade nos próximos conteúdos.`,
      headline: "Vamos falar sobre isso?",
      subheadline: "Tema quente da semana",
      visualScript: buildVisualScript(bestFormat, [
        "Abrir com pergunta forte relacionada ao tema",
        "Trazer um ponto curto de contexto",
        "Fechar com convite para comentário",
      ]),
      visualIdea: "Visual com abertura forte, texto curto e linguagem alinhada ao melhor formato recente.",
      cta: "Convide o público a comentar a própria experiência.",
    },
    {
      title: "Conteúdo educativo prático",
      objective: "education",
      format: "carousel",
      description: `Transformar os insights da semana em um conteúdo claro e útil para o segmento ${input.clientSegment}.`,
      caption: `Nem sempre o básico está claro na correria do dia a dia. Por isso, reunimos um guia rápido e prático para te ajudar a enxergar esse tema com mais clareza, aplicar melhor e salvar para consultar quando precisar. ✨`,
      headline: "Guia rápido da semana",
      subheadline: "Aplicação simples e útil",
      visualScript: buildVisualScript("carousel", [
        "Slide 1 com promessa clara",
        "Slide 2 com contexto do problema",
        "Slide 3 com dica prática",
        "Slide 4 com fechamento e resumo",
      ]),
      visualIdea: "Carrossel com capa objetiva, boa hierarquia de texto e fechamento com resumo visual.",
      cta: "Peça para salvar o conteúdo para consultar depois.",
    },
    {
      title: "Bastidor com prova de rotina",
      objective: "engagement",
      format: "story",
      description: "Mostrar bastidores para aproximar a marca e dar contexto real ao trabalho da semana.",
      caption: `Nem tudo aparece no feed, mas muita coisa importante acontece nos bastidores. 👀 Hoje abrimos um pouco da rotina para te mostrar como tudo ganha forma por aqui. Quer ver mais desse lado da marca? Responde pra gente nos stories.`,
      headline: "Por trás da entrega",
      subheadline: "Bastidores da semana",
      visualScript: buildVisualScript("story", [
        "Frame 1 com bastidor principal",
        "Frame 2 com detalhe da rotina",
        "Frame 3 com sticker de interação",
      ]),
      visualIdea: "Sequência de stories com recortes reais, enquete e pergunta aberta.",
      cta: "Estimule respostas por enquete ou direct.",
    },
    {
      title: "Post de conversão objetiva",
      objective: "conversion",
      format: "image",
      description: "Traduzir a oportunidade comercial da semana em uma mensagem direta e acionável.",
      caption: `Se você busca uma solução mais clara, prática e alinhada ao que faz sentido agora, este pode ser o seu próximo passo. ✅ Fale com a gente para entender como isso funciona na prática e descobrir a melhor forma de avançar.`,
      headline: "Hora de dar o próximo passo",
      subheadline: "Clareza para agir agora",
      visualScript: buildVisualScript("image", [
        "Composição única com headline forte",
        "Benefício principal em destaque",
        "Elemento visual apontando para o CTA",
      ]),
      visualIdea: "Peça estática com headline forte, produto ou serviço em destaque e benefício principal visível.",
      cta: "Direcione para reserva, orçamento ou direct.",
    },
    {
      title: "Formato campeão, ângulo novo",
      objective: "education",
      format: topFormat,
      description: `Reaproveitar o melhor formato recente com um novo ângulo ligado a ${bestTheme}.`,
      caption: `${bestTheme} continua rendendo boas conversas por um motivo simples: quando o assunto é relevante, uma nova perspectiva sempre abre espaço para aprender mais. 🚀 Hoje queremos te mostrar esse tema por outro ângulo, de forma rápida, clara e útil.`,
      headline: "Novo olhar, mesmo tema",
      subheadline: "Formato que já funciona",
      visualScript: buildVisualScript(topFormat, [
        "Abrir com novo gancho",
        "Desenvolver o insight principal",
        "Encerrar com direcionamento claro",
      ]),
      visualIdea: "Usar a mesma lógica visual de um formato vencedor, mas com nova narrativa.",
      cta: "Incentive o público a compartilhar com alguém que precisa dessa dica.",
    },
    {
      title: "Pergunta para ativar comentários",
      objective: "engagement",
      format: "image",
      description: `Lançar uma pergunta curta ligada a ${bestTheme} para estimular comentários rápidos.`,
      caption: `Vamos abrir uma conversa rápida? Quando o assunto é ${bestTheme}, qual é a sua principal dúvida, desafio ou curiosidade hoje? 💡 Deixa sua resposta nos comentários e vamos continuar essa troca juntos.`,
      headline: "Sua opinião importa",
      subheadline: "Conta pra gente",
      visualScript: buildVisualScript("image", [
        "Composição única centrada na pergunta",
        "Apoio visual leve para reforçar o tema",
        "Área de respiro para leitura rápida",
      ]),
      visualIdea: "Arte estática com pergunta central em destaque e fundo limpo.",
      cta: "Peça para responder nos comentários.",
    },
    {
      title: "Reel com insight rápido",
      objective: "education",
      format: "reel",
      description: "Condensar um insight útil da semana em vídeo curto com ritmo e retenção.",
      caption: `Às vezes, um ajuste pequeno muda tudo. 🎥 Neste vídeo, você vai ver um insight rápido que pode deixar sua leitura mais clara, sua decisão mais segura e sua ação mais simples no dia a dia. Assista até o fim e salve para rever depois.`,
      headline: "Dica rápida que ajuda",
      subheadline: "Aprendizado da semana",
      visualScript: buildVisualScript("reel", [
        "Cena 1 com hook forte na tela",
        "Cena 2 com exemplo prático",
        "Cena 3 com aplicação direta",
        "Cena 4 com CTA final",
      ]),
      visualIdea: "Reel com cortes curtos, texto na tela e encerramento reforçando o insight.",
      cta: "Convide a audiência a salvar o vídeo para rever depois.",
    },
    {
      title: "Story para validar interesse",
      objective: "conversion",
      format: "story",
      description: "Aquecer a audiência e mapear interesse antes de uma oferta mais direta.",
      caption: `Queremos entender melhor o que faz sentido para você agora. Responde nossa enquete nos stories e conta qual caminho parece mais interessante neste momento. A sua resposta ajuda a gente a trazer soluções cada vez mais alinhadas ao que você precisa.`,
      headline: "Faz sentido para você?",
      subheadline: "Queremos te ouvir",
      visualScript: buildVisualScript("story", [
        "Frame 1 com pergunta objetiva",
        "Frame 2 com enquete simples",
        "Frame 3 com convite para direct",
      ]),
      visualIdea: "Stories com enquete, termômetro de interesse e convite visual para conversa.",
      cta: "Direcione para enquete ou mensagem direta.",
    },
    {
      title: "Autoridade com exemplo real",
      objective: "conversion",
      format: "carousel",
      description: `Reforçar credibilidade com um exemplo prático ligado a ${firstInsight}.`,
      caption: `Na prática, confiança se constrói com clareza. 📌 Por isso, trouxemos um exemplo real para mostrar como esse tema funciona fora da teoria e o que faz diferença quando chega a hora de decidir com mais segurança.`,
      headline: "Na prática, funciona assim",
      subheadline: "Exemplo real para entender",
      visualScript: buildVisualScript("carousel", [
        "Slide 1 com situação inicial",
        "Slide 2 com leitura do cenário",
        "Slide 3 com solução aplicada",
        "Slide 4 com chamada final",
      ]),
      visualIdea: "Carrossel com narrativa progressiva, exemplo real e solução objetiva.",
      cta: "Convide o público a chamar no direct ou pedir mais informações.",
    },
  ];
}

function createSingleFallbackTopic(input: {
  currentTopic: GeneratedTopicPayload;
  context: {
    clientName: string;
    metricsSummary: MetricsSummary;
    metricsInsights: MetricsInsights;
  };
}): GeneratedTopicPayload {
  const bestTheme = input.context.metricsSummary.mostEngagingTheme ?? "bastidores";
  const insight = input.context.metricsInsights.insights[0] ?? "aprendizado da semana";
  const format = input.currentTopic.format;

  return {
    ...input.currentTopic,
    title: `${input.currentTopic.title} renovado`,
    description: `Nova leitura estratégica sobre ${bestTheme}, mantendo aderência ao formato e ao insight "${insight}".`,
    caption: `${bestTheme} continua relevante, mas agora por uma perspectiva diferente: mais direta, mais clara e mais próxima da realidade de quem acompanha a marca. Se esse ponto também conversa com você, vale ficar por aqui e continuar essa troca com a gente.`,
    headline: "Novo gancho para testar",
    subheadline: "Mesmo objetivo, outra entrada",
    visualScript: buildVisualScript(format, [
      "Abrir com hook renovado",
      "Desenvolver o ponto central com clareza",
      "Fechar com CTA visual consistente",
    ]),
    visualIdea: `Nova proposta visual para ${format}, com entrada mais forte e narrativa mais clara.`,
    cta: "Convide a audiência para uma ação simples e direta.",
  };
}

function buildVisualScript(
  format: GeneratedTopicPayload["format"],
  steps: string[],
): string[] {
  const labels = {
    carousel: "Slide",
    reel: "Cena",
    image: "Composição",
    story: "Frame",
  } as const;

  return steps.map((step, index) => `${labels[format]} ${index + 1}: ${step}`);
}

function normalizeVisualScript(value: unknown, format: string): string[] {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return buildVisualScript(normalizeFormat(format), [
    "Abertura com mensagem principal",
    "Desenvolvimento visual do argumento",
    "Fechamento com CTA",
  ]);
}

function sanitizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeFormat(value: string | null): GeneratedTopicPayload["format"] {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.includes("carrossel") || normalized.includes("carousel")) {
    return "carousel";
  }

  if (normalized.includes("story")) {
    return "story";
  }

  if (normalized.includes("imagem") || normalized.includes("image")) {
    return "image";
  }

  return "reel";
}

function normalizeObjective(value: string): GeneratedTopicPayload["objective"] {
  const normalized = value.trim().toLowerCase();

  if (normalized === "education" || normalized === "conversion") {
    return normalized;
  }

  return "engagement";
}
