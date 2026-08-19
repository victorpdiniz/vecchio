-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'outro',
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME,
    "billId" TEXT,
    "recurrenceRule" TEXT,
    "recurrenceGroupId" TEXT,
    "googleEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgendaItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AgendaItem" ("billId", "category", "createdAt", "endAt", "googleEventId", "id", "isAllDay", "recurrenceGroupId", "recurrenceRule", "startAt", "title", "updatedAt") SELECT "billId", "category", "createdAt", "endAt", "googleEventId", "id", "isAllDay", "recurrenceGroupId", "recurrenceRule", "startAt", "title", "updatedAt" FROM "AgendaItem";
DROP TABLE "AgendaItem";
ALTER TABLE "new_AgendaItem" RENAME TO "AgendaItem";
CREATE UNIQUE INDEX "AgendaItem_billId_key" ON "AgendaItem"("billId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
