import { NextResponse, type NextRequest } from "next/server";

// 1) 접속 코드: .env의 ACCESS_CODE가 있으면, 코드를 입력한 브라우저만 들어올 수 있습니다 (외부 시험용 보호막).
// 2) 로그인: 앱(/m)과 팀장 웹(/admin)은 사용자를 고른 뒤에만 들어갈 수 있습니다.
// 고객이 받는 자료 링크(/s/...)와 견적서 링크(/q/...)는 둘 다 거치지 않습니다.
const PUBLIC = [/^\/s\//, /^\/q\//, /^\/gate/, /^\/icons\//, /^\/manifest\.webmanifest/, /^\/sw\.js/, /^\/favicon/];

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (PUBLIC.some((r) => r.test(p))) return NextResponse.next();

  const code = process.env.ACCESS_CODE;
  if (code && req.cookies.get("sn_access")?.value !== code) {
    if (p.startsWith("/api/")) return NextResponse.json({ error: "접속 코드가 필요합니다" }, { status: 401 });
    const url = new URL("/gate", req.url);
    url.searchParams.set("next", p);
    return NextResponse.redirect(url);
  }

  if ((p.startsWith("/m") || p.startsWith("/admin")) && !req.cookies.get("sn_uid")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
