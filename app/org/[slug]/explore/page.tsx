import { auth } from "@/lib/auth";

// שלב 7 מחליף את הדף הזה ב-grid מרצים ושיעורים מאושרים
export default async function ExplorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  const session = await auth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">שלום, {session?.user?.name}</h1>
      <p className="text-neutral-500">תוכן הקורסים יופיע כאן — נבנה בהמשך.</p>
    </main>
  );
}
