import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_SUBPATHS = ["", "/", "/register", "/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const match = pathname.match(/^\/org\/([^/]+)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const slug = match[1];
  const rest = match[2] ?? "";

  if (PUBLIC_SUBPATHS.includes(rest)) return NextResponse.next();

  const user = req.auth?.user;
  if (!user) {
    return NextResponse.redirect(new URL(`/org/${slug}/login`, req.nextUrl));
  }

  // בידוד ארגוני: משתמש לא נכנס לנתיבים של ארגון אחר
  if (user.orgSlug !== slug) {
    return NextResponse.redirect(new URL(`/org/${user.orgSlug}`, req.nextUrl));
  }

  if (rest.startsWith("/admin") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/org/${slug}`, req.nextUrl));
  }

  const lecturerOnly =
    rest.startsWith("/dashboard") ||
    rest.startsWith("/lesson/new") ||
    /^\/lesson\/[^/]+\/review/.test(rest);
  if (lecturerOnly && user.role !== "LECTURER" && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL(`/org/${slug}/explore`, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/org/:path*"],
};
