import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { CreateOrgForm } from "./create-org-form";

const INTEREST_LABELS: Record<string, string> = {
  CONTENT: "תוכן למרצים",
  PARTNERSHIP: "שיתופי פעולה",
  AI_INTEGRATION: "הטמעת AI",
};

export default async function SuperadminPage() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) redirect("/");

  const [orgs, leads] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true, lessons: true } } },
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const openLeads = leads.filter((l) => !l.handled);

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">ניהול פלטפורמה</h1>
            <p className="text-neutral-500 text-sm mt-1">שלום, {guard.user.name}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-sm text-neutral-500 hover:text-neutral-800 underline">
              יציאה
            </button>
          </form>
        </header>

        {/* פניות חדשות */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">
            פניות חדשות{" "}
            {openLeads.length > 0 && (
              <span className="rounded-full bg-accent text-white text-sm px-2.5 py-0.5">
                {openLeads.length}
              </span>
            )}
          </h2>
          {leads.length === 0 ? (
            <p className="text-neutral-400">אין עדיין פניות.</p>
          ) : (
            <ul className="space-y-2">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className={`rounded-xl border p-3 text-sm ${
                    lead.handled
                      ? "border-neutral-200 bg-neutral-50 opacity-60"
                      : "border-accent/30 bg-accent/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <b>{lead.orgName}</b> · {lead.domain} ·{" "}
                      {INTEREST_LABELS[lead.interest] ?? lead.interest}
                      <br />
                      <a href={`mailto:${lead.email}`} className="text-accent" dir="ltr">
                        {lead.email}
                      </a>
                    </div>
                    {lead.handled ? (
                      <span className="text-xs text-neutral-400">טופל</span>
                    ) : (
                      <span className="text-xs text-accent font-medium">ממתין</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* יצירת ארגון */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">הקמת ארגון חדש</h2>
          <CreateOrgForm />
        </section>

        {/* ארגונים קיימים */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">ארגונים ({orgs.length})</h2>
          <ul className="space-y-2">
            {orgs.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3"
              >
                <div>
                  <b>{org.name}</b>{" "}
                  <span className="text-xs text-neutral-400" dir="ltr">
                    /{org.slug}
                  </span>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {org._count.users} משתמשים · {org._count.lessons} שיעורים
                  </p>
                </div>
                <Link
                  href={`/org/${org.slug}/admin`}
                  className="text-sm text-accent underline shrink-0"
                >
                  ניהול
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
