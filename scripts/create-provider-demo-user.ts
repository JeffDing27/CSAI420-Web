import { config } from "dotenv";
import crypto from "crypto";

config({ path: ".env.local", override: true });

async function main() {
  const [{ Role }, { prisma }] = await Promise.all([
    import("@prisma/client"),
    import("../src/lib/prisma"),
  ]);

  const email = "eliammputu113@gmail.com";
  const password = "ProviderDemo123!";

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.CLINICIAN,
      passwordHash: hash,
      passwordSalt: salt,
      userName: email,
    },
    create: {
      userName: email,
      email,
      firstName: "Eliam",
      lastName: "Demo",
      phone: "+15550009999",
      birthDate: "2000-01-01",
      region: "US",
      passwordHash: hash,
      passwordSalt: salt,
      role: Role.CLINICIAN,
    },
  });

  console.log("CLINICIAN_READY", user.email, user.role);
  console.log("LOGIN_PASSWORD", password);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
