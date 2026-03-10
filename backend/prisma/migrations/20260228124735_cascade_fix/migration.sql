-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "videoId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'youtube',
    "viralScore" INTEGER,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clip_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("confidence", "createdAt", "id", "platform", "title", "videoId", "viralScore") SELECT "confidence", "createdAt", "id", "platform", "title", "videoId", "viralScore" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
