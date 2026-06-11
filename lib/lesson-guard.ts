import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/guard";

type LessonGuardResult =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof requireUser>> & { ok: true }>["user"];
      lesson: { id: string; lecturerId: string; orgId: string; status: string; title: string };
    }
  | { ok: false; error: string; status: 401 | 403 | 404 };

// גישה לשיעור לצורך ניהול: רק המרצה שיצר אותו, או אדמין של אותו ארגון
export async function requireLessonOwner(lessonId: string): Promise<LessonGuardResult> {
  const guard = await requireUser();
  if (!guard.ok) {
    return { ok: false, error: guard.error, status: guard.status };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, lecturerId: true, orgId: true, status: true, title: true },
  });
  // בידוד ארגוני: שיעור של ארגון אחר נראה כלא-קיים
  if (!lesson || lesson.orgId !== guard.user.orgId) {
    return { ok: false, error: "השיעור לא נמצא", status: 404 };
  }
  if (lesson.lecturerId !== guard.user.id && guard.user.role !== "ADMIN") {
    return { ok: false, error: "רק המרצה שיצר את השיעור יכול לנהל אותו", status: 403 };
  }

  return { ok: true, user: guard.user, lesson };
}
