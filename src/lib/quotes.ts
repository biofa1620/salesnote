// 견적 계산·표시 공통
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export const VAT_RATE = 0.1;

export type DraftItem = { productId: string | null; name: string; unit: string; qty: number; listPrice: number; unitPrice: number };

export function totals(items: DraftItem[]) {
  const totalList = items.reduce((a, i) => a + i.qty * i.listPrice, 0);
  const total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const offList = items.some((i) => i.unitPrice !== i.listPrice);
  return { totalList, total, vat: Math.round(total * VAT_RATE), needsApproval: offList };
}

export const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "승인 대기", cls: "warn" },
  APPROVED: { label: "발송 가능", cls: "primary" },
  REJECTED: { label: "반려", cls: "bad" },
  SENT: { label: "발송됨", cls: "ok" },
};

/** 견적서에 찍히는 공급자 정보 (.env로 바꿀 수 있음) */
export const seller = () => ({
  name: process.env.SELLER_NAME || "주식회사 다우기술",
  ceo: process.env.SELLER_CEO || "김윤덕",
  address: process.env.SELLER_ADDRESS || "경기도 성남시 수정구 금토로 69 다우디지털스퀘어",
  bizNo: process.env.SELLER_BIZ_NO || "",
  logo: process.env.SELLER_LOGO || "/brand/logo.png", // public/brand/logo.png 에 회사 CI 파일을 넣으세요
});
export const sellerName = () => seller().name;
