// הפיכת/יצירת משתמש למנהל פלטפורמה:
//   node scripts/make-superadmin.js <email> <password> <orgSlug>
const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

(async () => {
  const [email, password, orgSlug] = process.argv.slice(2);
  if (!email || !password || !orgSlug) {
    console.error("usage: node scripts/make-superadmin.js <email> <password> <orgSlug>");
    process.exit(1);
  }
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    console.error(`לא נמצא ארגון עם slug ${orgSlug}`);
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      isSuperAdmin: true,
      role: "ADMIN",
      passwordHash,
      mustChangePassword: false,
      deletedAt: null,
    },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      displayName: "מנהל פלטפורמה",
      role: "ADMIN",
      orgId: org.id,
      isSuperAdmin: true,
      acceptedTerms: true,
      acceptedCookies: true,
    },
  });
  console.log(`✓ ${user.email} הוא מנהל פלטפורמה (דרך ארגון ${orgSlug})`);
  await prisma.$disconnect();
})();
