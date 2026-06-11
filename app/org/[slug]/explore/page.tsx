import Link from "next/link";
import { unstable_cache } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

// התוכן משתנה לאט — cache של 60 שניות, ממופתח לפי ארגון
const getLecturers = unstable_cache(
  async (orgId: string) => {
    const grouped = await prisma.lesson.groupBy({
      by: ["lecturerId"],
      where: { orgId, status: "APPROVED" },
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];
    const users = await prisma.user.findMany({
      where: {
        id: { in: grouped.map((g) => g.lecturerId) },
        deletedAt: null,
      },
      select: { id: true, displayName: true },
    });
    const counts = new Map(grouped.map((g) => [g.lecturerId, g._count._all]));
    return users
      .map((u) => ({
        id: u.id,
        name: u.displayName,
        lessonCount: counts.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.lessonCount - a.lessonCount);
  },
  ["explore-lecturers"],
  { revalidate: 60 }
);

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const user = session!.user;
  const lecturers = await getLecturers(user.orgId);

  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">המרצים שלנו</h1>
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

        {lecturers.length === 0 ? (
          <p className="text-center text-neutral-400 py-16">
            עדיין אין שיעורים מפורסמים — שווה לחזור בקרוב 🙂
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {lecturers.map((lecturer) => (
              <Link
                key={lecturer.id}
                href={`/org/${slug}/lecturer/${lecturer.id}`}
                className="rounded-2xl border border-neutral-200 p-5 text-center hover:border-accent transition-colors space-y-2"
              >
                <div className="size-14 rounded-full bg-accent/10 text-accent text-xl font-bold flex items-center justify-center mx-auto">
                  {lecturer.name.slice(0, 1)}
                </div>
                <h2 className="font-medium">{lecturer.name}</h2>
                <p className="text-xs text-neutral-400">
                  {lecturer.lessonCount === 1
                    ? "שיעור אחד"
                    : `${lecturer.lessonCount} שיעורים`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
