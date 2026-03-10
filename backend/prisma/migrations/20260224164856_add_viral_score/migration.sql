-- AlterTable
ALTER TABLE "Video" ADD COLUMN "predictedViews" TEXT;
ALTER TABLE "Video" ADD COLUMN "viralScore" INTEGER;

-- CreateTable
CREATE TABLE "BrandSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "logoUrl" TEXT,
    "logoPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "logoOpacity" REAL NOT NULL DEFAULT 0.8,
    "logoSize" TEXT NOT NULL DEFAULT 'medium',
    "watermarkUrl" TEXT,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watermarkPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "watermarkOpacity" REAL NOT NULL DEFAULT 0.5,
    "primaryColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "companyName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExportPreset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1080,
    "height" INTEGER NOT NULL DEFAULT 1920,
    "aspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "fps" INTEGER NOT NULL DEFAULT 30,
    "bitrate" TEXT NOT NULL DEFAULT 'high',
    "format" TEXT NOT NULL DEFAULT 'mp4',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AIGenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "inputData" TEXT,
    "outputUrl" TEXT,
    "error" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_userId_key" ON "BrandSettings"("userId");
