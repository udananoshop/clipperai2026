const bcrypt = require("bcryptjs");

async function reset() {
  // Use require to get prisma
  const { PrismaClient } = require("@prisma/client");
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "file:" + require("path").join(__dirname, "prisma", "dev.db")
      }
    }
  });

  try {
    const hash = await bcrypt.hash("12345", 10);

    const user = await prisma.user.upsert({
      where: { username: "admin" },
      update: { password: hash },
      create: {
        username: "admin",
        password: hash
      }
    });

    console.log("✅ ADMIN RESET SUCCESS");
    console.log("Username:", user.username);
    console.log("Password: 12345");
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
