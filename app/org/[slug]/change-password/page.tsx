import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { roleHome } from "@/lib/role-home";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });
  if (!org) notFound();

  const session = await auth();
  const home = session?.user ? roleHome(session.user) : `/org/${org.slug}/dashboard`;

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">בחירת סיסמה</h1>
          <p className="text-neutral-500">
            ברוכים הבאים ל{org.name}! לפני שמתחילים, בחרו סיסמה אישית חדשה.
          </p>
        </div>
        <ChangePasswordForm orgSlug={org.slug} home={home} />
      </div>
    </main>
  );
}
