# 세일즈노트 서버 이미지 (Railway·Render·Fly.io 또는 사내 서버에서 사용)
FROM node:22-bookworm-slim
WORKDIR /app
ENV TZ=Asia/Seoul NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# better-sqlite3 빌드에 필요한 도구 (미리 빌드된 파일이 없을 때 대비)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ tzdata && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build
# DB 파일과 업로드 파일은 /data(영구 저장 공간)에 둡니다
ENV DATABASE_URL=file:/data/salesnote.db UPLOAD_DIR=/data/uploads AI_PROVIDER=mock COMPANY_INFO_PROVIDER=mock
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
