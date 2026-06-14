import type { NextAuthConfig } from "next-auth";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

// קונפיג משותף שבטוח להרצה ב-edge (middleware) — בלי Prisma ובלי bcrypt.
// ה-providers המלאים מתווספים ב-lib/auth.ts.
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
        token.mustChangePassword = user.mustChangePassword;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      // אחרי החלפת סיסמה בכניסה ראשונה — מרעננים את הדגל בלי re-login
      if (trigger === "update" && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as AppRole | undefined) ?? "STUDENT";
        session.user.orgId = (token.orgId as string | undefined) ?? "";
        session.user.orgSlug = (token.orgSlug as string | undefined) ?? "";
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
