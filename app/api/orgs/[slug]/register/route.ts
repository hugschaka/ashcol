import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const registerSchema = z.object({
  displayName: z.string().trim().min(2, "שם התצוגה קצר מדי").max(60, "שם התצוגה ארוך מדי"),
  email: z.email("כתובת המייל לא תקינה"),
  password: z.string().min(8, "הסיסמא חייבת להיות באורך 8 תווים לפחות").max(100, "הסיסמא ארוכה מדי"),
  role: z.enum(["LECTURER", "STUDENT"]),
  acceptedTerms: z.literal(true, "חובה לאשר את תנאי השימוש"),
  acceptedCookies: z.literal(true, "חובה לאשר את מדיניות הקוקיז"),
  acceptedUpdates: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  const { displayName, email, password, role, acceptedTerms, acceptedCookies, acceptedUpdates } =
    parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "המייל כבר רשום במערכת" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role,
        orgId: org.id,
        displayName,
        acceptedTerms,
        acceptedCookies,
        acceptedUpdates,
      },
    });
  } catch (e: unknown) {
    // מרוץ נדיר: שני רישומים במקביל עם אותו מייל
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "המייל כבר רשום במערכת" }, { status: 400 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
