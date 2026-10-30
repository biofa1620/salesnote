// 녹음 원본 자동 삭제 (기본 90일 = 3개월). 녹취록과 요약 카드는 남깁니다.
// 운영 서버에서 하루 한 번 실행하세요. 예) crontab: 0 3 * * * cd /app && npm run cleanup:audio
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db, meetings } from "../src/db";
import { deleteFile } from "../src/lib/storage";

async function main() {
  const days = Number(process.env.AUDIO_RETENTION_DAYS ?? 90);
  const cutoff = new Date(Date.now() - days * 86400000);
  const old = await db.query.meetings.findMany({
    where: and(isNotNull(meetings.audioPath), isNull(meetings.audioDeletedAt), lt(meetings.createdAt, cutoff)),
  });
  for (const m of old) {
    await deleteFile(m.audioPath!);
    await db.update(meetings).set({ audioDeletedAt: new Date() }).where(eq(meetings.id, m.id));
  }
  console.log(`녹음 원본 ${old.length}건을 삭제했습니다 (${days}일 경과).`);
}
main();
