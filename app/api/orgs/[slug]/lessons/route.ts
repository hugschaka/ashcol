import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { extractText, MAX_FILE_SIZE } from "@/lib/extract-text";
import { requireUser } from "@/lib/guard";

const MAX_LESSONS_PER_DAY = 10;

const lessonSchema = z.object({
  title: z.string().trim().min(2, "כותרת באורך 2 תווים לפחות").max(150, "הכותרת ארוכה מדי"),
  content: z
    .string()
    .trim()
    .min(100, "תוכן השיעור קצר מדי — נדרשים לפחות 100 תווים")
    .max(500_000, "התוכן ארוך מדי"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const guard = await requireUser(slug, ["LECTURER", "ADMIN"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const user = guard.user;

  // הגנת עלויות AI: מכסה יומית מבוססת DB (שורדת restart)
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.lesson.count({
    where: { lecturerId: user.id, createdAt: { gte: dayStart } },
  });
  if (todayCount >= MAX_LESSONS_PER_DAY) {
    return NextResponse.json(
      { error: "הגעתם למכסת 10 שיעורים ביום — נסו שוב מחר" },
      { status: 429 }
    );
  }

  // קובץ מגיע כ-base64 בתוך JSON (לא multipart) — Next מיירט multipart-עם-קובץ
  // כ-Server Action ומנתק את החיבור.
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    content?: string;
    fileName?: string;
    fileBase64?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const title = String(body.title ?? "");
  let content = String(body.content ?? "");

  if (body.fileBase64 && body.fileName) {
    const buffer = Buffer.from(body.fileBase64, "base64");
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי — המגבלה היא 10MB" },
        { status: 400 }
      );
    }
    const extracted = await extractText(body.fileName, buffer);
    if ("error" in extracted) {
      return NextResponse.json({ error: extracted.error }, { status: 400 });
    }
    content = [content.trim(), extracted.text.trim()].filter(Boolean).join("\n\n");
  }

  const parsed = lessonSchema.safeParse({ title, content });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  const lesson = await prisma.$transaction(async (tx) => {
    const created = await tx.lesson.create({
      data: {
        title: parsed.data.title,
        rawContent: parsed.data.content,
        lecturerId: user.id,
        orgId: user.orgId,
      },
    });
    await tx.job.create({
      data: { type: "generate_lesson", payload: { lessonId: created.id } },
    });
    return created;
  });

  return NextResponse.json({ ok: true, lessonId: lesson.id }, { status: 201 });
}
