import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

type GuardResult =
  | { ok: true; user: Session["user"] }
  | { ok: false; error: string; status: 401 | 403 };

// בדיקת הרשאות אחידה לכל ה-API routes: מחובר? שייך לארגון? בעל תפקיד מתאים?
export async function requireUser(
  orgSlug?: string,
  roles?: AppRole[]
): Promise<GuardResult> {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return { ok: false, error: "נדרשת התחברות", status: 401 };
  }
  if (orgSlug && user.orgSlug !== orgSlug) {
    return { ok: false, error: "אין לך הרשאה לארגון הזה", status: 403 };
  }
  if (roles && !roles.includes(user.role)) {
    return { ok: false, error: "אין לך הרשאה לפעולה הזו", status: 403 };
  }
  return { ok: true, user };
}
