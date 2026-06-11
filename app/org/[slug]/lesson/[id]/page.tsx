import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AssetViewer } from "./asset-viewer";

const TYPE_ORDER = ["PRESENTATION", "QUIZ", "FLASHCARDS", "INFOGRAPHIC"] as const;

// דף הסטודנטים — תוכן מאושר משתנה לאט, cache 60 שניות
const getApprovedLesson = unstable_cache(
  async (lessonId: string) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        lecturer: { select: { id: true, displayName: true } },
        // לסטודנטים רק גרסאות מאושרות — הגרסה המאושרת האחרונה מכל סוג
        assets: { where: { approved: true }, orderBy: { version: "desc" } },
      },
    });
    if (!lesson) return null;
    const latestApproved = TYPE_ORDER.map((type) =>
      lesson.assets.find((a) => a.type === type)
    )
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ type: a.type as string, content: a.content }));
    return {
      id: lesson.id,
      title: lesson.title,
      status: lesson.status,
      orgId: lesson.orgId,
      lecturerId: lesson.lecturerId,
      lecturerName: lesson.lecturer.displayName,
      updatedAt: lesson.updatedAt,
      assets: latestApproved,
    };
  },
  ["student-lesson"],
  { revalidate: 60 }
);

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const session = await auth();
  const user = session!.user;

  const lesson = await getApprovedLesson(id);
  // בידוד ארגוני נאכף גם כאן — שיעור של ארגון אחר לא קיים מבחינת המשתמש
  if (!lesson || lesson.orgId !== user.orgId) notFound();

  if (lesson.status !== "APPROVED") {
    // בעל השיעור מנותב לדף הניהול; כל השאר לא רואים שיעור לא מפורסם
    if (lesson.lecturerId === user.id || user.role === "ADMIN") {
      redirect(`/org/${slug}/lesson/${id}/review`);
    }
    notFound();
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">{lesson.title}</h1>
            <Link
              href={`/org/${slug}/lecturer/${lesson.lecturerId}`}
              className="text-sm text-neutral-500 hover:text-neutral-800 underline shrink-0"
            >
              חזרה
            </Link>
          </div>
          <p className="text-neutral-500 text-sm">{lesson.lecturerName}</p>
        </header>

        {lesson.assets.length === 0 ? (
          <p className="text-center text-neutral-400 py-16">
            התוכן בהכנה — נסו שוב מאוחר יותר.
          </p>
        ) : (
          <AssetViewer assets={lesson.assets} />
        )}
      </div>
    </main>
  );
}
