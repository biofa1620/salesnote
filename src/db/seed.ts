// 데모용 샘플 데이터. 고객사·사람 이름은 모두 지어낸 예시입니다.
// 날짜는 실행한 날을 기준으로 만들어서, 언제 실행해도 "오늘" 화면이 채워집니다.
import { db, users, companies, contacts, deals, events, meetings, comments, activities } from "./index";
import type { MeetingSummary } from "./schema";

function at(dayOffset: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}
const plus = (d: Date, min: number) => new Date(d.getTime() + min * 60000);

async function main() {
  for (const t of [comments, activities, meetings, events, deals, contacts, companies, users]) {
    await db.delete(t);
  }

  const [lead, kim, lee, park, choi, jung] = await db
    .insert(users)
    .values([
      { name: "오팀장", email: "lead@salesnote.example", role: "LEAD" },
      { name: "김다우", email: "dawoo.kim@salesnote.example" },
      { name: "이서준", email: "seojun.lee@salesnote.example" },
      { name: "박하은", email: "haeun.park@salesnote.example" },
      { name: "최민호", email: "minho.choi@salesnote.example" },
      { name: "정예린", email: "yerin.jung@salesnote.example" },
    ])
    .returning();

  const co = Object.fromEntries(
    (
      await db
        .insert(companies)
        .values([
          { name: "한빛물산", industry: "유통" },
          { name: "세온테크", industry: "IT 서비스" },
          { name: "대한로지텍", industry: "물류" },
          { name: "미래카드", industry: "금융" },
          { name: "오션푸드", industry: "식품" },
          { name: "그린로직스", industry: "물류" },
        ])
        .returning()
    ).map((c) => [c.name, c])
  );

  const ct = Object.fromEntries(
    (
      await db
        .insert(contacts)
        .values([
          { companyId: co["한빛물산"].id, name: "박지훈", department: "구매팀", title: "팀장", phone: "010-0000-1001", email: "jh.park@hanbit.example", memo: "메시징 세미나에서 만남", createdById: kim.id, createdAt: at(-16, "14:20") },
          { companyId: co["한빛물산"].id, name: "최유나", department: "구매팀", title: "대리", phone: "010-0000-1002", createdById: kim.id, createdAt: at(-9, "11:00") },
          { companyId: co["세온테크"].id, name: "이수민", department: "고객지원팀", title: "과장", phone: "010-0000-2001", createdById: kim.id, createdAt: at(-12, "10:00") },
          { companyId: co["대한로지텍"].id, name: "한도윤", department: "물류운영팀", title: "차장", phone: "010-0000-3001", createdById: jung.id, createdAt: at(-30, "10:00") },
          { companyId: co["미래카드"].id, name: "윤재호", department: "제휴사업팀", title: "팀장", phone: "010-0000-4001", createdById: kim.id, createdAt: at(-20, "10:00") },
          { companyId: co["오션푸드"].id, name: "김수진", department: "마케팅팀", title: "과장", phone: "010-0000-5001", createdById: lee.id, createdAt: at(-25, "10:00") },
          { companyId: co["그린로직스"].id, name: "정태민", department: "운영팀", title: "대리", phone: "010-0000-6001", createdById: park.id, createdAt: at(-40, "10:00") },
        ])
        .returning()
    ).map((c) => [c.name, c])
  );

  const dl = Object.fromEntries(
    (
      await db
        .insert(deals)
        .values([
          { companyId: co["한빛물산"].id, ownerId: kim.id, title: "사내 알림 메시지 도입", stage: "미팅" },
          { companyId: co["세온테크"].id, ownerId: kim.id, title: "고객 안내 문자 자동화", stage: "미팅" },
          { companyId: co["대한로지텍"].id, ownerId: jung.id, title: "알림톡 단가 재계약", stage: "협상" },
          { companyId: co["미래카드"].id, ownerId: kim.id, title: "제휴 타겟문자 공동 상품", stage: "제안" },
          { companyId: co["오션푸드"].id, ownerId: jung.id, title: "주문 알림톡 도입", stage: "발굴" },
          { companyId: co["그린로직스"].id, ownerId: park.id, title: "배송 안내 문자 전환", stage: "미팅" },
        ])
        .returning()
    ).map((d) => [d.title, d])
  );

  const ev = (
    owner: string, company: string | null, title: string, day: number, time: string, min: number,
    type = "MEETING", extra: Partial<typeof events.$inferInsert> = {}
  ) => {
    const startAt = at(day, time);
    return { ownerId: owner, companyId: company ? co[company].id : null, title, type, startAt, endAt: plus(startAt, min), ...extra };
  };
  const evRows = await db
    .insert(events)
    .values([
      ev(kim.id, "한빛물산", "한빛물산 · 서비스 소개 미팅", 0, "10:00", 60, "MEETING", { contactId: ct["박지훈"].id, dealId: dl["사내 알림 메시지 도입"].id, location: "고객사 3층 회의실", accompany: "REQUESTED" }),
      ev(kim.id, "세온테크", "세온테크 · 2차 미팅", 0, "14:00", 45, "MEETING", { contactId: ct["이수민"].id, location: "화상 미팅" }),
      ev(kim.id, null, "주간 영업회의", 0, "16:30", 30, "INTERNAL"),
      ev(lee.id, null, "주간 영업회의", 0, "16:30", 30, "INTERNAL"),
      ev(jung.id, "대한로지텍", "대한로지텍 · 정기 미팅", 0, "09:30", 40),
      ev(kim.id, "세온테크", "세온테크 · 1차 미팅", -1, "11:00", 35),
      ev(lee.id, "세온테크", "세온테크 · 통화 후속 미팅", -1, "14:00", 30),
      ev(kim.id, "미래카드", "미래카드 · 제휴 미팅", -2, "15:00", 60),
      ev(jung.id, "오션푸드", "오션푸드 · 첫 미팅", -2, "10:00", 60),
      ev(park.id, "그린로직스", "그린로직스 · 미팅", -22, "15:00", 60),
      ev(park.id, "오션푸드", "오션푸드 · 소개 미팅 동석", -3, "15:00", 60),
      ev(choi.id, null, "메시징 세미나 부스", -4, "09:00", 480, "INTERNAL"),
      ev(kim.id, "한빛물산", "한빛물산 · 첫 미팅", -8, "10:00", 60),
      ev(kim.id, "세온테크", "세온테크 · 도입 범위 회신 받기", 3, "10:00", 30, "TODO", { source: "AI" }),
      ev(kim.id, "한빛물산", "한빛물산 · 단가표 메일 발송", 6, "09:00", 30, "TODO"),
    ])
    .returning();
  const evBy = (title: string) => evRows.find((e) => e.title === title)!.id;

  const s1: MeetingSummary = {
    points: ["사내 공지 문자 월 약 3만 건을 알림톡으로 전환 검토", "비용 절감 폭이 결정 기준, 단가표 요청", "내년 예산이 1월에 확정되어 12월 안에 제안 필요"],
    products: "알림톡 · 문자", budget: "내년 1월 확정", decisionMaker: "박지훈 팀장", competitor: "없음",
    concern: "기존 문자 업체와 계약이 3월까지 남아 있어 전환 시점 조율 필요",
    nextActions: [{ text: "발송량별 단가표 메일 발송", due: "다음 주 금요일" }, { text: "기존 계약 종료일 확인 요청" }],
  };
  const s2: MeetingSummary = {
    points: ["알림톡 단가 재협의 요청", "타사 견적과 비교 중이라고 언급", "최종 결정은 물류운영팀장 승인"],
    products: "알림톡", budget: "미정", decisionMaker: "물류운영팀장", competitor: "있음",
    concern: "타사 단가가 더 낮다는 언급이 있어 가격 외 차별점 제시 필요",
    nextActions: [{ text: "비교용 서비스 소개 자료 전달", due: "다음 주 화요일" }],
  };
  const s3: MeetingSummary = {
    points: ["고객 안내 문자 자동화에 관심", "도입 범위는 내부 검토 후 회신", "2차 미팅은 화상으로 진행"],
    products: "문자 · 알림톡", budget: "미정", decisionMaker: "확인 필요", competitor: "없음",
    concern: "의사결정자를 아직 만나지 못함",
    nextActions: [{ text: "도입 범위 회신 받기", due: "다음 주 화요일" }, { text: "의사결정자 미팅 요청" }],
  };
  const s4: MeetingSummary = {
    points: ["제휴 타겟문자 공동 상품 구성 논의", "양사 실무 담당자 지정", "다음 미팅에서 정산 방식 협의"],
    products: "타겟문자", budget: "해당 없음", decisionMaker: "제휴사업팀장", competitor: "없음",
    concern: "정산 방식에 대한 양사 기준이 다름",
    nextActions: [{ text: "정산 방식 초안 공유" }],
  };
  const transcript = [
    { speaker: "고객", text: "지금 공지 문자가 한 달에 3만 건 정도 나가는데, 알림톡으로 바꾸면 비용이 얼마나 줄까요?" },
    { speaker: "나", text: "발송량 기준으로 단가표를 정리해서 다음 주에 보내 드리겠습니다." },
    { speaker: "고객", text: "예산은 1월에 확정되니까 12월 안에는 받아야 해요." },
  ];

  const mRows = await db
    .insert(meetings)
    .values([
      { eventId: evBy("한빛물산 · 서비스 소개 미팅"), companyId: co["한빛물산"].id, dealId: dl["사내 알림 메시지 도입"].id, ownerId: kim.id, title: "한빛물산 서비스 소개 미팅", attendees: "박지훈 팀장, 최유나 대리", startedAt: at(0, "10:00"), durationSec: 52 * 60, transcript, summary: s1, status: "DRAFT" },
      { eventId: evBy("대한로지텍 · 정기 미팅"), companyId: co["대한로지텍"].id, ownerId: jung.id, title: "대한로지텍 정기 미팅", attendees: "한도윤 차장", startedAt: at(0, "09:30"), durationSec: 40 * 60, transcript, summary: s2, status: "CONFIRMED" },
      { eventId: evBy("세온테크 · 1차 미팅"), companyId: co["세온테크"].id, ownerId: kim.id, title: "세온테크 1차 미팅", attendees: "이수민 과장", startedAt: at(-1, "11:00"), durationSec: 35 * 60, transcript, summary: s3, status: "DRAFT" },
      { eventId: evBy("미래카드 · 제휴 미팅"), companyId: co["미래카드"].id, ownerId: kim.id, title: "미래카드 제휴 미팅", attendees: "윤재호 팀장", startedAt: at(-2, "15:00"), durationSec: 60 * 60, transcript, summary: s4, status: "CONFIRMED" },
    ])
    .returning();

  await db.insert(comments).values({ meetingId: mRows[1].id, authorId: lead.id, text: "다음 미팅은 제가 동행할게요. 일정 잡아 주세요.", createdAt: at(0, "11:20") });

  await db.insert(activities).values([
    { userId: kim.id, companyId: co["한빛물산"].id, type: "MEETING", text: "한빛물산 서비스 소개 미팅 회의록 생성", sub: "52분 녹음 · AI 요약 확인 필요", link: `/admin/meetings?id=${mRows[0].id}`, createdAt: at(0, "10:52") },
    { userId: jung.id, companyId: co["대한로지텍"].id, type: "MEETING", text: "대한로지텍 정기 미팅 회의록 확정", sub: "경쟁사 단가 비교 언급", link: `/admin/meetings?id=${mRows[1].id}`, createdAt: at(0, "10:05") },
    { userId: lee.id, companyId: co["세온테크"].id, type: "SCHEDULE", text: "세온테크 통화 후속 미팅 일정 등록", sub: "화상 미팅", createdAt: at(-1, "09:40") },
    { userId: choi.id, type: "CARD", text: "하늘병원 외 명함 5장 등록", sub: "메시징 세미나에서 받은 명함", createdAt: at(-1, "16:05") },
    { userId: lee.id, companyId: co["세온테크"].id, type: "CALL", text: "세온테크 이수민 과장 통화 6분", sub: "메모: 도입 범위 회신 일정 확인", createdAt: at(-1, "17:20") },
    { userId: kim.id, companyId: co["세온테크"].id, type: "MEETING", text: "세온테크 1차 미팅 회의록 생성", sub: "AI 요약 확인 필요", link: `/admin/meetings?id=${mRows[2].id}`, createdAt: at(-1, "12:10") },
    { userId: kim.id, companyId: co["미래카드"].id, type: "MEETING", text: "미래카드 제휴 미팅 회의록 확정", sub: "다음 할 일 1건", link: `/admin/meetings?id=${mRows[3].id}`, createdAt: at(-2, "15:58") },
    { userId: jung.id, companyId: co["오션푸드"].id, type: "SCHEDULE", text: "오션푸드 첫 미팅 일정 등록", createdAt: at(-3, "11:30") },
    { userId: park.id, companyId: co["그린로직스"].id, type: "CALL", text: "그린로직스 통화 연결 안 됨", sub: "메모 없음", createdAt: at(-21, "10:15") },
    { userId: kim.id, companyId: co["한빛물산"].id, contactId: ct["박지훈"].id, type: "CARD", text: "한빛물산 박지훈 팀장 명함 등록", sub: "메시징 세미나", createdAt: at(-16, "14:20") },
  ]);

  console.log("샘플 데이터를 넣었습니다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
