// 서버를 처음 띄울 때만 샘플 데이터를 넣습니다. 데이터가 이미 있으면 건드리지 않습니다.
import { db, users } from "../src/db";

async function main() {
  const n = await db.$count(users);
  if (n > 0) {
    console.log(`기존 데이터가 있어 샘플 데이터를 넣지 않습니다 (사용자 ${n}명).`);
    return;
  }
  await import("../src/db/seed");
}
main();
