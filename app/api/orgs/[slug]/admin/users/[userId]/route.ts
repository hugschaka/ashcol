import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guard";

const patchSchema = z
  .object({
    role: z.enum(["ADMIN", "LECTURER", "STUDENT"]).optional(),
    action: z.enum(["delete", "restore"]).optional(),
  })
  .refine((d) => d.role || d.action, { message: "אין מה לעדכן" });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const { slug, userId } = await params;
  const guard = await requireUser(slug, ["ADMIN"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  // בידוד ארגוני: משתמש מארגון אחר לא קיים מבחינת האדמין
  if (!target || target.orgId !== guard.user.orgId) {
    return NextResponse.json({ error: "המשתמש לא נמצא" }, { status: 404 });
  }

  // מניעת נעילה עצמית: אדמין לא מוחק ולא מוריד בדרגה את עצמו
  if (target.id === guard.user.id) {
    return NextResponse.json(
      { error: "אי אפשר לשנות או למחוק את המשתמש של עצמך" },
      { status: 400 }
    );
  }

  const { role, action } = parsed.data;
  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(role ? { role } : {}),
      ...(action === "delete" ? { deletedAt: new Date() } : {}),
      ...(action === "restore" ? { deletedAt: null } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
