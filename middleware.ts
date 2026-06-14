import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

// נתיבים פתוחים בתוך /org/[slug] (בלי התחברות)
const PUBLIC_SUBPATHS = ["", "/", "/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // אזור מנהל פלטפורמה
  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    if (!user) return NextResponse.redirect(new URL("/", req.nextUrl));
    if (!user.isSuperAdmin) {
      return NextResponse.redirect(new URL(`/org/${user.orgSlug}`, req.nextUrl));
    }
    if (user.mustChangePassword) {
      return NextResponse.redirect(
        new URL(`/org/${user.orgSlug}/change-password`, req.nextUrl)
      );
    }
    return NextResponse.next();
  }

  const match = pathname.match(/^\/org\/([^/]+)(\/.*)?$/);
  if (!match) return NextResponse.next();

  const slug = match[1];
  const rest = match[2] ?? "";

  if (PUBLIC_SUBPATHS.includes(rest)) return NextResponse.next();

  if (!user) {
    return NextResponse.redirect(new URL(`/org/${slug}/login`, req.nextUrl));
  }

  // אילוץ החלפת סיסמה בכניסה ראשונה — לפני כל גישה אחרת
  if (user.mustChangePassword && rest !== "/change-password") {
    return NextResponse.redirect(
      new URL(`/org/${user.orgSlug}/change-password`, req.nextUrl)
    );
  }
  // כבר אין צורך בהחלפה אבל נמצא בדף ההחלפה → לדשבורד המתאים
  if (!user.mustChangePassword && rest === "/change-password") {
    const home =
      user.role === "LECTURER" || user.role === "ADMIN" ? "/dashboard" : "/explore";
    return NextResponse.redirect(new URL(`/org/${slug}${home}`, req.nextUrl));
  }

  // superadmin עוקף בידוד ארגוני ובדיקות תפקיד
  if (user.isSuperAdmin) return NextResponse.next();

  // בידוד ארגוני
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
  matcher: ["/org/:path*", "/superadmin/:path*"],
};
