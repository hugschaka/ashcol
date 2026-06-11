import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
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

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">הרשמה</h1>
          <p className="text-neutral-500">{org.name}</p>
        </div>
        <RegisterForm orgSlug={org.slug} />
      </div>
    </main>
  );
}
