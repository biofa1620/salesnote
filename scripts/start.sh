#!/bin/sh
# 서버 시작: DB 구조 맞추기 → (처음이면) 샘플 데이터 → 서버 실행
set -e
mkdir -p "$(dirname "${DATABASE_URL#file:}")" "${UPLOAD_DIR:-./uploads}"
npx drizzle-kit push --force
npx tsx scripts/seed-if-empty.ts
exec npx next start -p "${PORT:-3000}"
