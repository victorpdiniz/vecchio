-- CreateTable
CREATE TABLE "AgendaReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendaItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER,
    "unit" TEXT,
    "daysBefore" INTEGER,
    "atHour" INTEGER,
    "atMinute" INTEGER,
    "triggerAt" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "AgendaReminder_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "AgendaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "recurrenceEndDate" DATETIME,
    "googleEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgendaItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AgendaItem" ("billId", "category", "createdAt", "endAt", "googleEventId", "id", "recurrenceEndDate", "recurrenceGroupId", "recurrenceRule", "startAt", "title", "updatedAt") SELECT "billId", "category", "createdAt", "endAt", "googleEventId", "id", "recurrenceEndDate", "recurrenceGroupId", "recurrenceRule", "startAt", "title", "updatedAt" FROM "AgendaItem";
DROP TABLE "AgendaItem";
ALTER TABLE "new_AgendaItem" RENAME TO "AgendaItem";
CREATE UNIQUE INDEX "AgendaItem_billId_key" ON "AgendaItem"("billId");
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("billId", "filename", "id", "storagePath", "uploadedAt", "uploadedById") SELECT "billId", "filename", "id", "storagePath", "uploadedAt", "uploadedById" FROM "Attachment" WHERE "billId" IS NOT NULL;
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
-- Registros antigos de NotificationLog referenciavam AgendaItem diretamente
-- (agendaItemId); o novo esquema referencia AgendaReminder (reminderId), que
-- não existe ainda para lembretes pré-existentes, então o log de dedupe é
-- descartado — os lembretes serão recriados a partir dos itens da agenda e
-- o dedupe recomeça do zero.
DELETE FROM "NotificationLog";
CREATE TABLE "new_NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "AgendaReminder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationLog" ("channel", "id", "reminderId", "sentAt", "sentTo") SELECT "channel", "id", "reminderId", "sentAt", "sentTo" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
