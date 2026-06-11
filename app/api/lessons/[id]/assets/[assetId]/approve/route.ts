import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLessonOwner } from "@/lib/lesson-guard";

export async function POST(
  _req: NextRequest,
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

  await prisma.lessonAsset.update({
    where: { id: assetId },
    data: { approved: true },
  });

  return NextResponse.json({ ok: true });
}
