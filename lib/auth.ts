import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  orgSlug: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, orgSlug: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password, orgSlug } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { org: { select: { slug: true } } },
        });
        if (!user || user.deletedAt) return null;
        // התחברות רק דרך הארגון שהמשתמש שייך אליו
        if (user.org.slug !== orgSlug) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
          orgId: user.orgId,
          orgSlug: user.org.slug,
        };
      },
    }),
  ],
});
