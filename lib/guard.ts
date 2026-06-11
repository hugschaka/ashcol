import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

type GuardResult =
  | { user: Session["user"]; error?: never; status?: never }
  | { user?: never; error: string; status: 401 | 403 };

// בדיקת הרשאות אחידה לכל ה-API routes: מחובר? שייך לארגון? בעל תפקיד מתאים?
export async function requireUser(
  orgSlug?: string,
  roles?: AppRole[]
): Promise<GuardResult> {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return { error: "נדרשת התחברות", status: 401 };
  }
  if (orgSlug && user.orgSlug !== orgSlug) {
    return { error: "אין לך הרשאה לארגון הזה", status: 403 };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: "אין לך הרשאה לפעולה הזו", status: 403 };
  }
  return { user };
}
