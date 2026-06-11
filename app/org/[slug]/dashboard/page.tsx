import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AutoRefresh } from "@/components/auto-refresh";

const STATUS_META: Record<
  string,
  { label: string; cls: string }
> = {
  PROCESSING: { label: "🔵 בעיבוד", cls: "bg-blue-50 text-blue-700" },
  PENDING_APPROVAL: { label: "🟡 ממתין לאישורך", cls: "bg-yellow-50 text-yellow-700" },
  EDITING: { label: "🟠 בעריכה", cls: "bg-orange-50 text-orange-700" },
  APPROVED: { label: "🟢 מאושר", cls: "bg-green-50 text-green-700" },
  FAILED: { label: "🔴 נכשל", cls: "bg-red-50 text-red-700" },
};

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { slug } = await params;
  const { created } = await searchParams;
  const session = await auth();
  const user = session!.user; // middleware מבטיח שיש session של מרצה/אדמין

  const lessons = await prisma.lesson.findMany({
    where: { orgId: user.orgId, lecturerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  const activeLessons = lessons
    .filter((l) => l.status === "PROCESSING" || l.status === "EDITING")
    .map((l) => ({ id: l.id, status: l.status as string }));

  return (
    <main className="flex-1 p-6">
      <AutoRefresh lessons={activeLessons} />
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">השיעורים שלי</h1>
            <p className="text-neutral-500 text-sm mt-1">שלום, {user.name}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/org/${slug}` });
            }}
          >
            <button className="text-sm text-neutral-500 hover:text-neutral-800 underline">
              יציאה
            </button>
          </form>
        </header>

        {created && (
          <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3 text-sm">
            השיעור נוצר ונמצא בעיבוד — התוצרים יופיעו כאן כשיהיו מוכנים.
          </div>
        )}

        <Link
          href={`/org/${slug}/lesson/new`}
          className="block w-full rounded-2xl bg-accent text-white text-center py-4 text-lg font-medium hover:opacity-90 transition-opacity"
        >
          + שיעור חדש
        </Link>

        {lessons.length === 0 ? (
          <p className="text-center text-neutral-400 py-12">
            אין עדיין שיעורים — צרו את הראשון!
          </p>
        ) : (
          <ul className="space-y-3">
            {lessons.map((lesson) => {
              const meta = STATUS_META[lesson.status] ?? STATUS_META.PROCESSING;
              const reviewable =
                lesson.status === "PENDING_APPROVAL" ||
                lesson.status === "EDITING" ||
                lesson.status === "APPROVED";
              const inner = (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="font-medium truncate">{lesson.title}</h2>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {lesson.createdAt.toLocaleDateString("he-IL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {lesson.status === "PROCESSING" && (
                      <p className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
                        <span className="inline-block size-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        זה לוקח כמה דקות, אפשר לצאת ולחזור
                      </p>
                    )}
                    {lesson.status === "FAILED" && lesson.errorMessage && (
                      <p className="text-xs text-red-600 mt-2">{lesson.errorMessage}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                </div>
              );
              return (
                <li key={lesson.id}>
                  {reviewable ? (
                    <Link
                      href={`/org/${slug}/lesson/${lesson.id}/review`}
                      className="block rounded-2xl border border-neutral-200 p-4 hover:border-accent transition-colors"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="rounded-2xl border border-neutral-200 p-4">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
