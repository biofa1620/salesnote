import type { CompanyInfo } from "@/db/schema";

/** 회사명으로 찾은 후보 (같은 이름의 회사가 여러 곳일 수 있어 영업사원이 한 번 확인합니다) */
export type CompanyCandidate = { id: string; name: string; bizNo: string; ceo: string; address: string };

/**
 * 기업 정보 연동 인터페이스 (기획 추가 기능 1번).
 * mock.ts(샘플 데이터)와 real.ts(실제 API)가 같은 모양을 구현합니다.
 */
export interface CompanyInfoProvider {
  search(name: string): Promise<CompanyCandidate[]>;
  fetch(candidateId: string, name: string): Promise<{ bizNo: string; info: CompanyInfo }>;
}
export type { CompanyInfo };
