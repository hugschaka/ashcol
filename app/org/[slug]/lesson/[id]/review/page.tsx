import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AutoRefresh } from "@/components/auto-refresh";
import { AssetCard, type AssetForCard } from "./asset-card";
import { PublishButton } from "./publish-button";

const TYPE_ORDER = ["PRESENTATION", "QUIZ", "FLASHCARDS", "INFOGRAPHIC"] as const;

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const session = await auth();
  const user = session!.user;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { assets: { orderBy: { version: "desc" } } },
  });
  // בידוד ארגוני
  if (!lesson || lesson.orgId !== user.orgId) notFound();
  // רק בעל השיעור או אדמין
  if (lesson.lecturerId !== user.id && user.role !== "ADMIN") {
    redirect(`/org/${slug}/dashboard`);
  }

  const latestAssets = TYPE_ORDER.map((type) =>
    lesson.assets.find((a) => a.type === type)
  ).filter((a): a is NonNullable<typeof a> => Boolean(a));

  const allApproved =
    latestAssets.length === TYPE_ORDER.length &&
    latestAssets.every((a) => a.approved);
  const busy = lesson.status === "EDITING" || lesson.status === "PROCESSING";

  return (
    <main className="flex-1 p-6">
      {busy && <AutoRefresh lessons={[{ id: lesson.id, status: lesson.status }]} />}
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{lesson.title}</h1>
            <p className="text-neutral-500 text-sm mt-1">
              בדקו כל תוצר — אשרו או שלחו לעריכה. כשכל הארבעה מאושרים אפשר לפרסם.
            </p>
          </div>
          <Link
            href={`/org/${slug}/dashboard`}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline"
          >
            חזרה לדשבורד
          </Link>
        </header>

        {lesson.status === "APPROVED" && (
          <div className="rounded-xl bg-green-50 text-green-800 px-4 py-3 text-sm">
            🟢 השיעור מפורסם ונראה לסטודנטים. אפשר עדיין לשלוח תוצרים לעריכה —
            גרסה חדשה תחזור לאישור לפני שתוצג.
          </div>
        )}
        {lesson.status === "EDITING" && (
          <div className="rounded-xl bg-orange-50 text-orange-800 px-4 py-3 text-sm flex items-center gap-2">
            <span className="inline-block size-3 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
            עריכה בתהליך — זה לוקח כמה דקות, אפשר לצאת ולחזור.
          </div>
        )}
        {lesson.errorMessage && lesson.status !== "FAILED" && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
            {lesson.errorMessage}
          </div>
        )}

        {latestAssets.length === 0 ? (
          <p className="text-center text-neutral-400 py-12">
            אין עדיין תוצרים לשיעור הזה.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {latestAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                lessonId={lesson.id}
                asset={
                  {
                    id: asset.id,
                    type: asset.type,
                    version: asset.version,
                    approved: asset.approved,
                    content: asset.content,
                    fileUrl: asset.fileUrl,
                  } satisfies AssetForCard
                }
                disabled={busy}
                notebookId={lesson.notebookId}
              />
            ))}
          </div>
        )}

        {lesson.status !== "APPROVED" && latestAssets.length > 0 && (
          <PublishButton lessonId={lesson.id} enabled={allApproved && !busy} />
        )}
      </div>
    </main>
  );
}
