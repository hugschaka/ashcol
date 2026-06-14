import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { createUserWithTempPassword } from "@/lib/create-user";

const schema = z.object({
  displayName: z.string().trim().min(2, "שם קצר מדי").max(60, "שם ארוך מדי"),
  email: z.email("כתובת המייל לא תקינה"),
  role: z.enum(["LECTURER", "ADMIN"]),
});

// יצירת משתמש חדש בארגון (מרצה או אדמין) עם סיסמה ראשונית אקראית.
// אדמין-ארגון יכול ליצור מרצים; superadmin יכול ליצור גם אדמינים.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const guard = await requireUser(slug, ["ADMIN"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    return NextResponse.json({ error: "הארגון לא נמצא" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  // רק superadmin יכול למנות אדמינים נוספים
  if (parsed.data.role === "ADMIN" && !guard.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "רק מנהל פלטפורמה יכול למנות אדמין לארגון" },
      { status: 403 }
    );
  }

  const result = await createUserWithTempPassword({
    orgId: org.id,
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // הסיסמה מוחזרת פעם אחת בלבד — האדמין מוסר אותה למשתמש
  return NextResponse.json(
    { ok: true, email: parsed.data.email, tempPassword: result.tempPassword },
    { status: 201 }
  );
}
