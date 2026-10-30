import type { MeetingSummary, TranscriptLine } from "@/db/schema";

/** 명함 OCR 결과 */
export type CardFields = {
  name: string;
  company: string;
  department?: string;
  title?: string;
  phone?: string;
  email?: string;
};

/**
 * AI 기능 공통 인터페이스.
 * mock.ts(가짜 응답)와 real.ts(실제 API)가 같은 모양을 구현합니다.
 * 화면·API 코드는 이 인터페이스만 쓰므로, API 키를 받으면 real.ts만 채우면 됩니다.
 */
export interface AiProvider {
  /** 명함 사진 → 연락처 항목 */
  readBusinessCard(image: Buffer, mimeType: string): Promise<CardFields>;
  /** 녹음 파일 → 화자별 녹취록 */
  transcribe(audio: Buffer, mimeType: string): Promise<TranscriptLine[]>;
  /** 통화 후 10초 음성 메모 → 한 줄 텍스트 */
  transcribeMemo(audio: Buffer, mimeType: string): Promise<string>;
  /** 녹취록 → 미팅 카드 요약 */
  summarize(input: { companyName: string; transcript: TranscriptLine[] }): Promise<MeetingSummary>;
}

export type { MeetingSummary, TranscriptLine };
