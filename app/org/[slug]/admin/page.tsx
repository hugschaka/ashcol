import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserRow } from "./user-row";
import { CreateUserForm } from "./create-user-form";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PROCESSING: { label: "🔵 בעיבוד", cls: "bg-blue-50 text-blue-700" },
  PENDING_APPROVAL: { label: "🟡 ממתין לאישור", cls: "bg-yellow-50 text-yellow-700" },
  EDITING: { label: "🟠 בעריכה", cls: "bg-orange-50 text-orange-700" },
  APPROVED: { label: "🟢 מאושר", cls: "bg-green-50 text-green-700" },
  FAILED: { label: "🔴 נכשל", cls: "bg-red-50 text-red-700" },
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const user = session!.user;
  // אדמין של הארגון, או מנהל פלטפורמה (גישה לכל ארגון)
  const allowed = user.isSuperAdmin || (user.role === "ADMIN" && user.orgSlug === slug);
  if (!allowed) redirect(`/org/${slug}`);

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!org) notFound();

  const [users, lessons] = await Promise.all([
    prisma.user.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    prisma.lesson.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        lecturer: { select: { displayName: true } },
      },
    }),
  ]);

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">ניהול {org.name}</h1>
            {user.isSuperAdmin && (
              <Link href="/superadmin" className="text-xs text-accent underline">
                ← לניהול הפלטפורמה
              </Link>
            )}
          </div>
          <Link
            href={`/org/${slug}/dashboard`}
            className="text-sm text-neutral-500 hover:text-neutral-800 underline"
          >
            לדשבורד
          </Link>
        </header>

        {/* יצירת משתמש חדש */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">הוספת מרצה / משתמש</h2>
          <CreateUserForm
            orgSlug={slug}
            orgName={org.name}
            canCreateAdmin={user.isSuperAdmin}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">משתמשים ({users.length})</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <UserRow
                key={u.id}
                orgSlug={slug}
                user={{
                  id: u.id,
                  name: u.displayName,
                  email: u.email,
                  role: u.role,
                  deleted: Boolean(u.deletedAt),
                  isSelf: u.id === user.id,
                }}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">כל השיעורים ({lessons.length})</h2>
          {lessons.length === 0 ? (
            <p className="text-neutral-400">אין עדיין שיעורים בארגון.</p>
          ) : (
            <ul className="space-y-2">
              {lessons.map((lesson) => {
                const meta = STATUS_META[lesson.status] ?? STATUS_META.PROCESSING;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/org/${slug}/lesson/${lesson.id}/review`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 hover:border-accent transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{lesson.title}</p>
                        <p className="text-xs text-neutral-400">
                          {lesson.lecturer.displayName} ·{" "}
                          {lesson.createdAt.toLocaleDateString("he-IL")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
