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

/** 견적서에 찍히는 공급자 이름 (.env의 SELLER_NAME) */
export const sellerName = () => process.env.SELLER_NAME || "다우기술";
