import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const getLecturerLessons = unstable_cache(
  async (orgId: string, lecturerId: string) => {
    const lecturer = await prisma.user.findFirst({
      where: { id: lecturerId, orgId, deletedAt: null },
      select: { displayName: true },
    });
    if (!lecturer) return null;
    const lessons = await prisma.lesson.findMany({
      where: { orgId, lecturerId, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return { name: lecturer.displayName, lessons };
  },
  ["lecturer-lessons"],
  { revalidate: 60 }
);

export default async function LecturerPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const session = await auth();
  const user = session!.user;

  const data = await getLecturerLessons(user.orgId, id);
  if (!data) notFound();

  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{data.name}</h1>
          <Link
            href={`/org/${slug}/explore`}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline"
          >
            כל המרצים
          </Link>
        </header>

        {data.lessons.length === 0 ? (
          <p className="text-center text-neutral-400 py-16">
            אין עדיין שיעורים מפורסמים של המרצה.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/org/${slug}/lesson/${lesson.id}`}
                  className="block rounded-2xl border border-neutral-200 p-4 hover:border-accent transition-colors"
                >
                  <h2 className="font-medium">{lesson.title}</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    עודכן{" "}
                    {new Date(lesson.updatedAt).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
