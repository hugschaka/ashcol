import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) notFound();

  const session = await auth();
  const user = session?.user;
  const isMember = user?.orgSlug === slug;

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">{org.name}</h1>
      {org.domain && <p className="text-neutral-500">{org.domain}</p>}

      {isMember ? (
        <div className="flex gap-3 flex-wrap justify-center">
          {(user.role === "LECTURER" || user.role === "ADMIN") && (
            <Link
              href={`/org/${org.slug}/dashboard`}
              className="rounded-xl bg-accent text-white px-6 py-3 font-medium"
            >
              השיעורים שלי
            </Link>
          )}
          <Link
            href={`/org/${org.slug}/explore`}
            className={`rounded-xl px-6 py-3 font-medium ${
              user.role === "STUDENT"
                ? "bg-accent text-white"
                : "border border-neutral-300"
            }`}
          >
            תוכן הקורסים
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href={`/org/${org.slug}/admin`}
              className="rounded-xl border border-neutral-300 px-6 py-3 font-medium"
            >
              ניהול
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Link
            href={`/org/${org.slug}/login`}
            className="rounded-xl bg-accent text-white px-8 py-3 font-medium"
          >
            התחברות
          </Link>
          <p className="text-sm text-neutral-400 max-w-xs">
            אין לכם פרטי כניסה? פנו למנהל הארגון שלכם — הוא יקים לכם חשבון.
          </p>
        </div>
      )}
    </main>
  );
}
