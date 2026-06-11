import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) notFound();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold">{org.name}</h1>
      {org.domain && <p className="text-neutral-500">{org.domain}</p>}
      <div className="flex gap-3">
        <Link
          href={`/org/${org.slug}/register`}
          className="rounded-xl bg-accent text-white px-6 py-3 font-medium"
        >
          הרשמה
        </Link>
        <Link
          href={`/org/${org.slug}/login`}
          className="rounded-xl border border-neutral-300 px-6 py-3 font-medium"
        >
          התחברות
        </Link>
      </div>
    </main>
  );
}
