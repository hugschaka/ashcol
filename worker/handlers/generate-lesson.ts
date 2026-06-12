import { prisma } from "../db";
import { buildNotebookPrompts } from "../claude";
import { generateLessonAssets } from "../notebooklm";

export async function handleGenerateLesson(payload: unknown): Promise<void> {
  const lessonId = (payload as { lessonId?: string })?.lessonId;
  if (!lessonId) throw new Error("payload חסר lessonId");

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      org: { select: { slug: true } },
    },
  });
  if (!lesson) {
    console.log(`[generate_lesson] שיעור ${lessonId} לא קיים — מדלגים`);
    return;
  }

  console.log(`[generate_lesson] ${lessonId} | "${lesson.title}" | בונה פרומפטים...`);
  const { prompts, usedClaude } = await buildNotebookPrompts(
    lesson.title,
    lesson.rawContent
  );
  console.log(
    `[generate_lesson] ${lessonId} | פרומפטים מוכנים (claude=${usedClaude}) | מייצר תוצרים...`
  );

  const result = await generateLessonAssets({
    orgSlug: lesson.org.slug,
    lecturerId: lesson.lecturerId,
    lessonTitle: lesson.title,
    sourceText: lesson.rawContent,
    prompts,
    existingNotebookId: lesson.notebookId,
  });

  // שומרים את 4 התוצרים ומעדכנים סטטוס באטומיות
  await prisma.$transaction(async (tx) => {
    for (const asset of result.assets) {
      await tx.lessonAsset.create({
        data: {
          lessonId: lesson.id,
          type: asset.type,
          content: asset.content as object,
          fileUrl: asset.fileUrl ?? null,
        },
      });
    }
    await tx.lesson.update({
      where: { id: lesson.id },
      data: {
        status: "PENDING_APPROVAL",
        notebookId: result.notebookId,
        errorMessage: null,
      },
    });
  });

  console.log(`[generate_lesson] ${lessonId} | ✓ ${result.assets.length} תוצרים נשמרו, ממתין לאישור המרצה`);
}
