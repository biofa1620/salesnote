import { NextResponse, type NextRequest } from "next/server";

// 로그인하지 않은 사용자는 로그인 화면으로 보냅니다.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("sn_uid")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/m/:path*", "/admin/:path*"] };
