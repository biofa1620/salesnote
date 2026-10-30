// 가짜 AI 응답. API 키 없이도 화면 흐름 전체를 시험할 수 있게 고정된 결과를 돌려줍니다.
import type { AiProvider } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SAMPLE_CARDS = [
  { name: "송지민", company: "바른교육", department: "교육사업부", title: "실장", phone: "010-0000-7001", email: "jm.song@bareun.example" },
  { name: "강민서", company: "하늘병원", department: "원무팀", title: "팀장", phone: "010-0000-7002", email: "ms.kang@haneul.example" },
  { name: "박지훈", company: "한빛물산", department: "구매팀", title: "팀장", phone: "010-0000-1001", email: "jh.park@hanbit.example" },
];

export const mockProvider: AiProvider = {
  async readBusinessCard(image) {
    await wait(600);
    // 같은 사진이면 같은 결과가 나오도록 파일 크기로 고릅니다.
    return SAMPLE_CARDS[image.length % SAMPLE_CARDS.length];
  },

  async transcribe() {
    await wait(800);
    return [
      { speaker: "고객", text: "지금 고객 안내 문자를 직접 보내고 있는데, 자동으로 바꾸고 싶어요." },
      { speaker: "나", text: "발송량과 지금 쓰시는 방식을 알려 주시면 맞는 상품으로 제안드리겠습니다." },
      { speaker: "고객", text: "내부 검토를 거쳐서 다음 주 화요일까지 도입 범위를 정리해 드릴게요." },
      { speaker: "나", text: "네, 그 사이에 단가표와 도입 사례를 메일로 보내 드리겠습니다." },
      { speaker: "고객", text: "결정은 팀장님이 하시니까 다음엔 같이 뵈면 좋겠습니다." },
    ];
  },

  async transcribeMemo() {
    await wait(500);
    return "다음 주 화요일까지 도입 범위 회신 주기로 함. 단가표 먼저 메일로 보내기.";
  },

  async summarize({ companyName }) {
    await wait(800);
    return {
      points: [
        `${companyName}에서 고객 안내 문자 자동화를 검토 중`,
        "도입 범위는 내부 검토 후 다음 주 화요일까지 회신",
        "결정권자(팀장) 동석 미팅 요청 필요",
      ],
      products: "문자 · 알림톡",
      budget: "미정",
      decisionMaker: "고객사 팀장 (미확인)",
      competitor: "없음",
      concern: "의사결정자를 아직 만나지 못함",
      nextActions: [
        { text: "단가표와 도입 사례 메일 발송", due: "이번 주" },
        { text: "도입 범위 회신 받기", due: "다음 주 화요일" },
        { text: "팀장 동석 미팅 요청" },
      ],
    };
  },
};
