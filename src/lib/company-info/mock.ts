// 기업 정보 샘플. 회사명으로 숫자를 만들어서 같은 회사는 늘 같은 값이 나옵니다.
// 화면에는 "샘플 데이터"로 표시되며 실제 회사 정보가 아닙니다.
import type { CompanyInfo, CompanyInfoProvider } from "./types";

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const GRADES = ["AA-", "A+", "A", "A-", "BBB+", "BBB", "BB+"];

export function mockCompanyInfo(name: string): CompanyInfo {
  const h = hash(name);
  const revenue = 120 + (h % 2400);
  const today = new Date();
  const d = (n: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() - n);
    return x.toISOString().slice(0, 10);
  };
  return {
    source: "샘플 데이터 (실제 API 연결 전)",
    fiscalYear: String(today.getFullYear() - 1),
    revenue,
    operatingProfit: Math.round(revenue * (((h >> 3) % 14) - 2) / 100),
    creditGrade: GRADES[h % GRADES.length],
    ceo: "대표자 (샘플)",
    address: "서울특별시 (샘플 주소)",
    disclosures: [
      { date: d(3 + (h % 5)), title: "[샘플] 주요사항보고서" },
      { date: d(20 + (h % 9)), title: "[샘플] 반기보고서" },
    ],
    news: [
      { date: d(1 + (h % 3)), title: `[샘플] ${name}, 고객 소통 채널 디지털 전환 추진`, press: "샘플일보" },
      { date: d(9 + (h % 6)), title: `[샘플] ${name} 하반기 신규 서비스 출시`, press: "샘플경제" },
    ],
    updatedAt: today.toISOString(),
  };
}

export const mockCompanyInfoProvider: CompanyInfoProvider = {
  async search(name) {
    const h = hash(name);
    const one = { id: `c-${h}`, name, bizNo: `${100 + (h % 800)}-${10 + (h % 80)}-${String(h % 100000).padStart(5, "0")}`, ceo: "대표자 (샘플)", address: "서울특별시 (샘플)" };
    // 이름이 비슷한 다른 회사도 함께 보여 주어 '확인' 단계를 시험할 수 있게 합니다.
    const other = { id: `c-${h + 1}`, name: `${name}홀딩스`, bizNo: `${100 + ((h + 1) % 800)}-${10 + ((h + 1) % 80)}-${String((h + 1) % 100000).padStart(5, "0")}`, ceo: "대표자 (샘플)", address: "경기도 (샘플)" };
    return [one, other];
  },
  async fetch(candidateId, name) {
    const list = await this.search(name);
    const c = list.find((x) => x.id === candidateId) ?? list[0];
    return { bizNo: c.bizNo, info: { ...mockCompanyInfo(c.name), ceo: c.ceo, address: c.address } };
  },
};
