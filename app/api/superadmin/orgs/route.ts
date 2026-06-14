import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/guard";
import { createUserWithTempPassword } from "@/lib/create-user";

const schema = z.object({
  name: z.string().trim().min(2, "שם הארגון קצר מדי").max(100, "שם הארגון ארוך מדי"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "מזהה קצר מדי")
    .max(40, "מזהה ארוך מדי")
    .regex(/^[a-z0-9-]+$/, "המזהה יכול להכיל רק אותיות אנגליות, מספרים ומקפים"),
  domain: z.string().trim().max(100).optional(),
  adminName: z.string().trim().min(2, "שם האדמין קצר מדי").max(60),
  adminEmail: z.email("מייל האדמין לא תקין"),
});

// מנהל פלטפורמה מקים ארגון חדש + משתמש אדמין ראשון עם סיסמה ראשונית
export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
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
  const { name, slug, domain, adminName, adminEmail } = parsed.data;

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "המזהה כבר תפוס — בחרו אחר" }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: { name, slug, domain: domain || null },
  });

  const result = await createUserWithTempPassword({
    orgId: org.id,
    email: adminEmail,
    displayName: adminName,
    role: "ADMIN",
  });
  if (!result.ok) {
    // האדמין נכשל — מנקים את הארגון שזה עתה נוצר כדי לא להשאיר ארגון בלי אדמין
    await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      org: { name: org.name, slug: org.slug },
      adminEmail,
      tempPassword: result.tempPassword,
    },
    { status: 201 }
  );
}
