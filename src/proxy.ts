import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isApiVapi = nextUrl.pathname.startsWith("/api/vapi");
  const isSignIn = nextUrl.pathname === "/sign-in";

  if (isApiAuth || isApiVapi) return NextResponse.next();

  if (isSignIn) {
    if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/sign-in", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
