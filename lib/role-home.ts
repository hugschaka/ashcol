// היעד הנכון אחרי התחברות/החלפת סיסמה, לפי תפקיד
export function roleHome(u: {
  role: string;
  isSuperAdmin: boolean;
  orgSlug: string;
}): string {
  if (u.isSuperAdmin) return "/superadmin";
  if (u.role === "ADMIN") return `/org/${u.orgSlug}/admin`;
  if (u.role === "LECTURER") return `/org/${u.orgSlug}/dashboard`;
  return `/org/${u.orgSlug}/explore`;
}
