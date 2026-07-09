import { OpenAI } from "openai";

let client = null;

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_TOKEN;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY or AI_TOKEN");
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
};

export const openai = new Proxy({}, {
  get(_target, prop) {
    return getOpenAIClient()[prop];
  },
});