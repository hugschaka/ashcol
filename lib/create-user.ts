import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateTempPassword } from "@/lib/password";

type CreateResult =
  | { ok: true; tempPassword: string; userId: string }
  | { ok: false; error: string };

// יצירת משתמש עם סיסמה ראשונית אקראית — משותף ל-superadmin ולאדמין-ארגון.
// המשתמש יאלץ להחליף סיסמה בכניסה הראשונה.
export async function createUserWithTempPassword(args: {
  orgId: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "LECTURER" | "STUDENT";
}): Promise<CreateResult> {
  const email = args.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "המייל כבר רשום במערכת" };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: args.displayName.trim(),
        role: args.role,
        orgId: args.orgId,
        mustChangePassword: true,
      },
    });
    return { ok: true, tempPassword, userId: user.id };
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return { ok: false, error: "המייל כבר רשום במערכת" };
    }
    throw e;
  }
}
