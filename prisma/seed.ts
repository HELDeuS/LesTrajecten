import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@lestrajecten.local";
  const password = process.env.ADMIN_PASSWORD || "Admin123!";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Beheerder",
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN",
      },
    });
    console.log(`Admin gebruiker aangemaakt: ${email} (wachtwoord: zie ADMIN_PASSWORD, standaard 'Admin123!')`);
  } else {
    console.log(`Admin gebruiker bestaat al: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
