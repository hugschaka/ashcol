import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

type GuardResult =
  | { ok: true; user: Session["user"] }
  | { ok: false; error: string; status: 401 | 403 };

// בדיקת הרשאות אחידה לכל ה-API routes: מחובר? שייך לארגון? בעל תפקיד מתאים?
// ה-JWT לא ניתן לביטול, לכן הסטטוס נבדק מול ה-DB בכל קריאה.
// superadmin עוקף את בדיקת הארגון והתפקיד (גישה לכל הפלטפורמה).
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
    select: { deletedAt: true, role: true, isSuperAdmin: true },
  });
  if (!dbUser || dbUser.deletedAt) {
    return { ok: false, error: "החשבון אינו פעיל", status: 401 };
  }
  const merged: Session["user"] = {
    ...user,
    role: dbUser.role as AppRole,
    isSuperAdmin: dbUser.isSuperAdmin,
  };
  // superadmin עוקף בידוד ארגוני ובדיקת תפקיד
  if (dbUser.isSuperAdmin) {
    return { ok: true, user: merged };
  }
  if (orgSlug && user.orgSlug !== orgSlug) {
    return { ok: false, error: "אין לך הרשאה לארגון הזה", status: 403 };
  }
  if (roles && !roles.includes(dbUser.role as AppRole)) {
    return { ok: false, error: "אין לך הרשאה לפעולה הזו", status: 403 };
  }
  return { ok: true, user: merged };
}

// רק מנהל פלטפורמה
export async function requireSuperAdmin(): Promise<GuardResult> {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    return { ok: false, error: "נדרשת התחברות", status: 401 };
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { deletedAt: true, isSuperAdmin: true, role: true },
  });
  if (!dbUser || dbUser.deletedAt || !dbUser.isSuperAdmin) {
    return { ok: false, error: "גישה למנהלי פלטפורמה בלבד", status: 403 };
  }
  return { ok: true, user: { ...user, isSuperAdmin: true, role: dbUser.role as AppRole } };
}
