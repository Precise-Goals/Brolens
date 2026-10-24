import "server-only";
import OpenAI from "openai";

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}
