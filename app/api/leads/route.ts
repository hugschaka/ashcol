import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const leadSchema = z.object({
  orgName: z.string().trim().min(2, "שם הארגון קצר מדי").max(100, "שם הארגון ארוך מדי"),
  domain: z.string().trim().min(2, "ספרו לנו בקצרה מה תחום הארגון").max(100, "תיאור התחום ארוך מדי"),
  interest: z.enum(["CONTENT", "PARTNERSHIP", "AI_INTEGRATION"]),
  email: z.email("כתובת המייל לא תקינה"),
});

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!rateLimit(`lead:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "קיבלנו כבר כמה פניות מהכתובת הזו — נסו שוב בעוד שעה" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  await prisma.lead.create({ data: parsed.data });
  return NextResponse.json({ ok: true }, { status: 201 });
}
