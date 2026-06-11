import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireLessonOwner } from "@/lib/lesson-guard";

const TYPE_LABELS: Record<string, string> = {
  PRESENTATION: "מצגת",
  QUIZ: "שאלון",
  FLASHCARDS: "כרטיסיות",
  INFOGRAPHIC: "אינפוגרפיה",
};

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const guard = await requireLessonOwner(id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  // הגרסה האחרונה של כל תוצר חייבת להיות מאושרת
  const assets = await prisma.lessonAsset.findMany({
    where: { lessonId: id },
    orderBy: { version: "desc" },
    select: { type: true, approved: true, version: true },
  });
  const latestByType = new Map<string, { approved: boolean }>();
  for (const asset of assets) {
    if (!latestByType.has(asset.type)) latestByType.set(asset.type, asset);
  }

  const missing = Object.keys(TYPE_LABELS).filter(
    (type) => !latestByType.get(type)?.approved
  );
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `אי אפשר לפרסם עדיין — נותרו תוצרים לא מאושרים: ${missing
          .map((t) => TYPE_LABELS[t])
          .join(", ")}`,
      },
      { status: 400 }
    );
  }

  await prisma.lesson.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  return NextResponse.json({ ok: true });
}
