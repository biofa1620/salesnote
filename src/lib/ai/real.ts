// 실제 AI API 연결 자리. API 키를 받으면 아래 세 함수를 채우고 .env의 AI_PROVIDER를 real로 바꾸세요.
// 후보 (기획서 7절): 명함 OCR - 네이버 클로바 OCR(명함 특화) / STT - 클로바 스피치, 리턴제로, Whisper
//                    요약 - Claude 등 LLM API (학습 미사용 조건 확인)
import type { AiProvider } from "./types";

const notReady = (what: string): never => {
  throw new Error(`${what} 실제 API가 아직 연결되지 않았습니다. src/lib/ai/real.ts를 구현하세요.`);
};

export const realProvider: AiProvider = {
  async readBusinessCard() {
    // 예: OCR_API_KEY로 명함 OCR API 호출 → 응답을 CardFields로 변환
    return notReady("명함 OCR");
  },
  async transcribe() {
    // 예: STT_API_KEY로 음성인식 API 호출(화자 분리 옵션 켜기) → TranscriptLine[]로 변환
    return notReady("음성인식");
  },
  async summarize() {
    // 예: LLM_API_KEY로 요약 요청. 응답은 MeetingSummary JSON 형식으로 받도록 프롬프트에 명시
    return notReady("AI 요약");
  },
};
