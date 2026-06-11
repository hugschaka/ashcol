import { prisma } from "../db";
import { buildEditPrompt } from "../claude";
import { generateEditedAsset, type AssetTypeName } from "../notebooklm";

const ALL_TYPES: AssetTypeName[] = ["PRESENTATION", "QUIZ", "FLASHCARDS", "INFOGRAPHIC"];

export async function handleEditAsset(payload: unknown): Promise<void> {
  const editRequestId = (payload as { editRequestId?: string })?.editRequestId;
  if (!editRequestId) throw new Error("payload חסר editRequestId");

  const editRequest = await prisma.editRequest.findUnique({
    where: { id: editRequestId },
    include: {
      lesson: { include: { org: { select: { slug: true } } } },
    },
  });
  if (!editRequest) {
    console.log(`[edit_asset] בקשת עריכה ${editRequestId} לא קיימת — מדלגים`);
    return;
  }
  if (editRequest.resolved) {
    console.log(`[edit_asset] ${editRequestId} כבר טופלה — מדלגים`);
    return;
  }

  const lesson = editRequest.lesson;
  // assetType=null פירושו עריכה כללית — מעדכנים את כל התוצרים
  const targetTypes: AssetTypeName[] = editRequest.assetType
    ? [editRequest.assetType as AssetTypeName]
    : ALL_TYPES;

  console.log(
    `[edit_asset] ${editRequestId} | "${lesson.title}" | ${targetTypes.join(",")} | מנסח פרומפט עריכה...`
  );

  for (const type of targetTypes) {
    const latest = await prisma.lessonAsset.findFirst({
      where: { lessonId: lesson.id, type },
      orderBy: { version: "desc" },
    });

    const { prompt, usedClaude } = await buildEditPrompt(
      lesson.title,
      type,
      editRequest.message
    );
    console.log(`[edit_asset] ${editRequestId} | ${type} | פרומפט מוכן (claude=${usedClaude})`);

    const result = await generateEditedAsset({
      orgSlug: lesson.org.slug,
      lecturerId: lesson.lecturerId,
      lessonTitle: lesson.title,
      assetType: type,
      editPrompt: prompt,
      baseContent: latest?.content ?? null,
      notebookId: lesson.notebookId,
    });

    await prisma.lessonAsset.create({
      data: {
        lessonId: lesson.id,
        type,
        content: result.content as object,
        version: (latest?.version ?? 0) + 1,
        // גרסה חדשה תמיד חוזרת לאישור המרצה
        approved: false,
      },
    });
  }

  await prisma.$transaction([
    prisma.editRequest.update({
      where: { id: editRequest.id },
      data: { resolved: true },
    }),
    prisma.lesson.update({
      where: { id: lesson.id },
      data: { status: "PENDING_APPROVAL", errorMessage: null },
    }),
  ]);

  console.log(`[edit_asset] ${editRequestId} | ✓ גרסאות חדשות נשמרו, חוזר לאישור`);
}
