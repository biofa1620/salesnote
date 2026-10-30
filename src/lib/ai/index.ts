import { mockProvider } from "./mock";
import { realProvider } from "./real";
import type { AiProvider } from "./types";

/** .env의 AI_PROVIDER 값(mock | real)에 따라 AI 구현을 고릅니다. */
export function ai(): AiProvider {
  return process.env.AI_PROVIDER === "real" ? realProvider : mockProvider;
}
export type * from "./types";
