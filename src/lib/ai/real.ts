// 실제 AI API 연결 자리. API 키를 받으면 아래 함수들을 채우고 .env의 AI_PROVIDER를 real로 바꾸세요.
// 후보 (기획서 7절): 명함 OCR - 네이버 클로바 OCR(명함 특화) / STT - 클로바 스피치, 리턴제로, Whisper
//                    요약 - Claude 등 LLM API (학습 미사용 조건 확인)
import type { AiProvider, CardFields } from "./types";
import { mockProvider } from "./mock";

const notReady = (what: string): never => {
  throw new Error(`${what} 실제 API가 아직 연결되지 않았습니다. src/lib/ai/real.ts를 구현하세요.`);
};

// CLOVA OCR 명함(Name Card) 도메인은 jpg/png/heic 등 확장자를 요구합니다.
const MIME_TO_CLOVA_FORMAT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heic",
};

type ClovaField = { text: string }[];
function firstText(field?: ClovaField): string | undefined {
  return field?.[0]?.text;
}

async function readBusinessCardWithClova(image: Buffer, mimeType: string): Promise<CardFields> {
  const invokeUrl = process.env.CLOVA_OCR_INVOKE_URL;
  const secret = process.env.CLOVA_OCR_SECRET;
  if (!invokeUrl || !secret) {
    return notReady("명함 OCR (.env에 CLOVA_OCR_INVOKE_URL / CLOVA_OCR_SECRET 없음)");
  }

  const res = await fetch(invokeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-OCR-SECRET": secret },
    body: JSON.stringify({
      version: "V2",
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      images: [
        {
          format: MIME_TO_CLOVA_FORMAT[mimeType] ?? "jpg",
          name: "namecard",
          data: image.toString("base64"),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`명함 OCR 호출 실패 (HTTP ${res.status})`);

  const data = await res.json();
  const image0 = data.images?.[0];
  if (image0?.inferResult !== "SUCCESS") {
    throw new Error(`명함 OCR 인식 실패: ${image0?.message ?? "알 수 없는 오류"}`);
  }

  const result = image0.nameCard?.result ?? {};
  const name = firstText(result.name);
  const company = firstText(result.company);
  if (!name || !company) throw new Error("명함에서 이름·회사를 읽지 못했습니다. 더 밝은 곳에서 다시 촬영해 주세요.");

  return {
    name,
    company,
    department: firstText(result.department),
    title: firstText(result.position),
    phone: firstText(result.mobile) ?? firstText(result.tel),
    email: firstText(result.email),
  };
}

export const realProvider: AiProvider = {
  readBusinessCard: readBusinessCardWithClova,
  // 음성인식·요약은 아직 API가 없어 가짜 응답을 그대로 씁니다. 키가 생기면 이 세 함수도 채우세요.
  transcribe: mockProvider.transcribe,
  transcribeMemo: mockProvider.transcribeMemo,
  summarize: mockProvider.summarize,
};
