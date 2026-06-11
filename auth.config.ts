import type { NextAuthConfig } from "next-auth";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

// קונפיג משותף שבטוח להרצה ב-edge (middleware) — בלי Prisma ובלי bcrypt.
// ה-providers המלאים מתווספים ב-lib/auth.ts.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as AppRole | undefined) ?? "STUDENT";
        session.user.orgId = (token.orgId as string | undefined) ?? "";
        session.user.orgSlug = (token.orgSlug as string | undefined) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
