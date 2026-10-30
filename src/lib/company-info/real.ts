// 실제 기업 정보 API 연결 자리. 계약·키를 받으면 채우고 .env의 COMPANY_INFO_PROVIDER를 real로 바꾸세요.
// - 무료: DART 전자공시 OpenAPI (기업개황·재무제표·공시목록, 상장·외감 기업 위주)
//         국세청 사업자등록 상태조회 (공공데이터포털), 네이버 뉴스 검색 API
// - 유료: KED(한국평가데이터)·NICE평가정보 기업신용 API (신용등급, 비상장 중소기업 재무)
import type { CompanyInfoProvider } from "./types";

const notReady = (): never => {
  throw new Error("기업 정보 실제 API가 아직 연결되지 않았습니다. src/lib/company-info/real.ts를 구현하세요.");
};

export const realCompanyInfoProvider: CompanyInfoProvider = {
  async search() {
    // 예: DART corpCode 목록에서 회사명 검색 → 후보 목록
    return notReady();
  },
  async fetch() {
    // 예: DART 재무·공시 + 뉴스 검색 + (계약 시) KED/NICE 신용등급을 합쳐 CompanyInfo로 변환
    return notReady();
  },
};
