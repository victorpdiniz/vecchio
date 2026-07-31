-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN "googleEventId" TEXT;
ALTER TABLE "AgendaItem" ADD COLUMN "location" TEXT;
ALTER TABLE "AgendaItem" ADD COLUMN "recurrenceEndDate" DATETIME;
ALTER TABLE "AgendaItem" ADD COLUMN "recurrenceGroupId" TEXT;
ALTER TABLE "AgendaItem" ADD COLUMN "recurrenceRule" TEXT;

-- CreateTable
CREATE TABLE "GoogleCalendarConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" DATETIME,
    "googleCalendarId" TEXT NOT NULL,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleCalendarConnection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Attachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT,
    "agendaItemId" TEXT,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "AgendaItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Attachment" ("billId", "filename", "id", "storagePath", "uploadedAt", "uploadedById") SELECT "billId", "filename", "id", "storagePath", "uploadedAt", "uploadedById" FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarConnection_profileId_key" ON "GoogleCalendarConnection"("profileId");
