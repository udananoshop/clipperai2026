const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

let prisma;

// Check for existing database file - DO NOT reset if exists
const dbPath = path.join(__dirname, "dev.db");
const dbExists = fs.existsSync(dbPath);

console.log("===========================================");
console.log("🔍 Prisma Database Check");
console.log("===========================================");
console.log("DB Path:", dbPath);
console.log("Database exists:", dbExists);
console.log("DATABASE_URL:", process.env.DATABASE_URL || "file:./prisma/dev.db (default)");
console.log("===========================================");

if (global.prisma) {
  console.log("♻️  Using existing Prisma client from global");
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({
    log: [
      { level: 'warn', emit: 'stdout' }
    ]
  });

  // Store in global to prevent multiple instances during dev
  if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
  }
  
  console.log("✅ Prisma client initialized - PERSISTENT MODE");
  console.log("===========================================");
}

module.exports = prisma;
