import Link from "next/link";
import { NewLessonForm } from "./new-lesson-form";

export default async function NewLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">שיעור חדש</h1>
          <Link
            href={`/org/${slug}/dashboard`}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline"
          >
            חזרה לדשבורד
          </Link>
        </div>
        <NewLessonForm orgSlug={slug} />
      </div>
    </main>
  );
}
