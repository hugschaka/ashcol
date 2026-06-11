import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireLessonOwner } from "@/lib/lesson-guard";

const editSchema = z.object({
  message: z
    .string()
    .trim()
    .min(3, "כתבו מה לשנות — לפחות כמה מילים")
    .max(2000, "הבקשה ארוכה מדי"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id, assetId } = await params;
  const guard = await requireLessonOwner(id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const asset = await prisma.lessonAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.lessonId !== id) {
    return NextResponse.json({ error: "התוצר לא נמצא" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "הנתונים לא תקינים" },
      { status: 400 }
    );
  }

  // בקשת עריכה → EditRequest + Job ל-worker + השיעור עובר ל"בעריכה"
  await prisma.$transaction(async (tx) => {
    const editRequest = await tx.editRequest.create({
      data: {
        lessonId: id,
        assetType: asset.type,
        message: parsed.data.message,
      },
    });
    await tx.job.create({
      data: { type: "edit_asset", payload: { editRequestId: editRequest.id } },
    });
    await tx.lesson.update({
      where: { id },
      data: { status: "EDITING" },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
