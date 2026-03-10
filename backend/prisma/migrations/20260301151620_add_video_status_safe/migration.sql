-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'youtube',
    "originalName" TEXT,
    "size" INTEGER,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viralScore" INTEGER,
    "predictedViews" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Video" ("createdAt", "filename", "id", "originalName", "path", "platform", "predictedViews", "size", "title", "userId", "viralScore") SELECT "createdAt", "filename", "id", "originalName", "path", "platform", "predictedViews", "size", "title", "userId", "viralScore" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
