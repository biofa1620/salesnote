/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
      // 휴대폰 시험용 HTTPS 터널 주소에서 입력 폼이 동작하도록 허용 (예: cloudflared, ngrok)
      allowedOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", ...(process.env.ALLOWED_ORIGINS?.split(",") ?? [])],
    },
  },
};
export default nextConfig;
