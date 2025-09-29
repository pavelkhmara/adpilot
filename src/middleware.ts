import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const clientId = req.cookies.get("clientId")?.value;
  if (clientId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// применяем только к нужным путям
export const config = {
  matcher: ["/dashboard/:path*", "/api/(campaigns|connections|import|recommendations)/:path*"],
};
