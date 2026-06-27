import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth temporarily disabled — restore by reverting to the auth() wrapper
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
