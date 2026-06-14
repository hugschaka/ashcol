import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "LECTURER" | "STUDENT";

declare module "next-auth" {
  interface User {
    role: AppRole;
    orgId: string;
    orgSlug: string;
    mustChangePassword: boolean;
    isSuperAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      orgId: string;
      orgSlug: string;
      mustChangePassword: boolean;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    orgId?: string;
    orgSlug?: string;
    mustChangePassword?: boolean;
    isSuperAdmin?: boolean;
  }
}
