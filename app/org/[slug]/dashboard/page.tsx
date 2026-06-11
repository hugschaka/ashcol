import { auth } from "@/lib/auth";

// שלב 4 מחליף את הדף הזה בדשבורד מלא עם רשימת שיעורים וסטטוסים
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  const session = await auth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">שלום, {session?.user?.name}</h1>
      <p className="text-neutral-500">דשבורד המרצה ייבנה בשלב הבא — אין עדיין שיעורים.</p>
    </main>
  );
}
