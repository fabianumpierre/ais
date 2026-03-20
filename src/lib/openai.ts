import OpenAI from "openai";
import { z } from "zod";

import type { MetricsSummary } from "@/server/metricsAnalyzer";

const topicDraftSchema = z.object({
  title: z.string().min(3),
  format: z.enum(["carousel", "reel", "image", "story"]),
  objective: z.enum(["engagement", "education", "conversion"]),
  description: z.string().min(10),
  visualIdea: z.string().min(10),
  cta: z.string().min(3),
});

export type TopicDraft = z.infer<typeof topicDraftSchema>;

type GenerateTopicsInput = {
  client: {
    name: string;
    segment: string;
    notes: string | null;
  };
  analysis: {
    insights: string;
    objective: string;
    date: Date;
  };
  metricsSummary: MetricsSummary;
};

function createFallbackTopics(input: GenerateTopicsInput): TopicDraft[] {
  const topFormat = mapFormatToApiValue(input.metricsSummary.bestFormat);
  const topTheme = input.metricsSummary.mostEngagingTheme ?? "bastidores";

  return [
    {
      title: `Trend da semana para ${input.client.name}`,
      format: topFormat,
      objective: "engagement",
      description: `Aproveitar o tema ${topTheme} em um conteudo conectado aos insights atuais do cliente.`,
      visualIdea: "Cenas rapidas do time, produto ou atendimento com texto forte na tela.",
      cta: "Convide a audiencia a comentar a principal dor ou desejo sobre o tema.",
    },
    {
      title: "Prova social com foco em conversao",
      format: "carousel",
      objective: "conversion",
      description: "Transformar aprendizados das postagens recentes em uma pauta com argumentos, resultados e exemplos praticos.",
      visualIdea: "Slides com contraste alto, depoimentos curtos e uma tela final com oferta ou direcionamento.",
      cta: "Peça para salvar o post e enviar para quem precisa dessa referencia.",
    },
    {
      title: "Bastidores da estrategia da semana",
      format: "story",
      description: "Mostrar o contexto das campanhas, promocoes ou eventos que o time quer reforcar nesta semana.",
      visualIdea: "Sequencia de 4 a 6 stories com stickers de enquete e caixa de perguntas.",
      cta: "Direcione a audiencia para responder a enquete ou enviar mensagem direta.",
      objective: "engagement",
    },
    {
      title: "Conteudo educativo com duvida frequente",
      format: "carousel",
      objective: "education",
      description: `Explicar um ponto importante relacionado ao tema ${topTheme} e conectar com o momento atual do cliente.`,
      visualIdea: "Carrossel com capa forte, comparativos visuais e ultimo slide com resumo pratico.",
      cta: "Estimule o publico a salvar o conteudo para consultar depois.",
    },
    {
      title: "Oferta ou oportunidade da semana",
      format: "image",
      objective: "conversion",
      description: "Traduzir o foco comercial da semana em uma mensagem direta, simples e clara para gerar acao.",
      visualIdea: "Peca unica com headline curta, produto ou servico em destaque e reforco visual da proposta.",
      cta: "Convide o publico a clicar, reservar, chamar no direct ou pedir orcamento.",
    },
  ];
}

export async function generateTopics(input: GenerateTopicsInput): Promise<TopicDraft[]> {
  if (!process.env.OPENAI_API_KEY) {
    return createFallbackTopics(input);
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
Você é um estrategista de conteúdo para redes sociais.
Gere 5 pautas em JSON para a próxima semana.

Cliente:
- Nome: ${input.client.name}
- Segmento: ${input.client.segment}
- Notas: ${input.client.notes ?? "Sem notas adicionais"}

Análise semanal:
- Data: ${input.analysis.date.toISOString()}
- Objetivo: ${input.analysis.objective}
- Insights: ${input.analysis.insights}

Resumo de métricas:
- Posts analisados: ${input.metricsSummary.totalPosts}
- Reach total: ${input.metricsSummary.totalReach}
- Engajamento medio: ${input.metricsSummary.avgEngagement}
- Formato mais frequente: ${input.metricsSummary.bestFormat ?? "N/A"}
- Formato com melhor engajamento medio: ${input.metricsSummary.bestFormatByEngagement ?? "N/A"}
- Tema com mais comentarios: ${input.metricsSummary.mostCommentedTheme ?? "N/A"}
- Tema com mais salvamentos: ${input.metricsSummary.mostSavedTheme ?? "N/A"}
- Tema mais engajador: ${input.metricsSummary.mostEngagingTheme ?? "N/A"}

Instruções:
- Crie exatamente 5 tópicos.
- Considere os insights do cliente, os formatos com melhor performance e os temas mais engajadores.
- Varie os objetivos entre engagement, education e conversion.
- Use apenas estes formatos: carousel, reel, image, story.
- Responda somente com JSON válido, sem markdown e sem texto extra.

Formato de saída:
[
  {
    "title": "",
    "format": "",
    "objective": "",
    "description": "",
    "visualIdea": "",
    "cta": ""
  }
]
`.trim();

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  try {
    const parsed = z.array(topicDraftSchema).length(5).parse(JSON.parse(response.output_text.trim()));
    if (parsed.length > 0) {
      return parsed;
    }
  } catch {
    return createFallbackTopics(input);
  }

  return createFallbackTopics(input);
}

function mapFormatToApiValue(format: string | null): TopicDraft["format"] {
  const normalized = format?.trim().toLowerCase() ?? "";

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
