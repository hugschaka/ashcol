import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

type GuardResult =
  | { ok: true; user: Session["user"] }
  | { ok: false; error: string; status: 401 | 403 };

// בדיקת הרשאות אחידה לכל ה-API routes: מחובר? שייך לארגון? בעל תפקיד מתאים?
// ה-JWT לא ניתן לביטול, לכן משתמש שנמחק (soft delete) נבדק מול ה-DB בכל קריאה.
export async function requireUser(
  orgSlug?: string,
  roles?: AppRole[]
): Promise<GuardResult> {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return { ok: false, error: "נדרשת התחברות", status: 401 };
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { deletedAt: true, role: true },
  });
  if (!dbUser || dbUser.deletedAt) {
    return { ok: false, error: "החשבון אינו פעיל", status: 401 };
  }
  // התפקיד נלקח מה-DB — שינוי תפקיד תופס מיד, בלי לחכות להתחברות מחדש
  const effectiveRole = dbUser.role as AppRole;
  if (orgSlug && user.orgSlug !== orgSlug) {
    return { ok: false, error: "אין לך הרשאה לארגון הזה", status: 403 };
  }
  if (roles && !roles.includes(effectiveRole)) {
    return { ok: false, error: "אין לך הרשאה לפעולה הזו", status: 403 };
  }
  return { ok: true, user: { ...user, role: effectiveRole } };
}
