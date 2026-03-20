import OpenAI from "openai";

export const TOPIC_GENERATION_MODEL = "gpt-4o-mini";

const globalForOpenAI = globalThis as {
  openai?: OpenAI;
};

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!globalForOpenAI.openai) {
    globalForOpenAI.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return globalForOpenAI.openai;
}
