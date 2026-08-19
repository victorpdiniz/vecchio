/*
  Warnings:

  - Added the required column `ownerProfileId` to the `Password` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "proposedAction" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "proposedActionStatus" TEXT;

-- CreateTable
CREATE TABLE "MedicineDoseLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "medicineId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "doseDate" TEXT NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "takenAt" DATETIME,
    "markedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MedicineDoseLog_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicineDoseLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MedicineSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicineDoseLog_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderId" TEXT,
    "doseLogId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'reminder',
    "channel" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationLog_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "AgendaReminder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationLog_doseLogId_fkey" FOREIGN KEY ("doseLogId") REFERENCES "MedicineDoseLog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_NotificationLog" ("channel", "id", "reminderId", "sentAt", "sentTo") SELECT "channel", "id", "reminderId", "sentAt", "sentTo" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
CREATE TABLE "new_Password" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteName" TEXT NOT NULL,
    "url" TEXT,
    "username" TEXT NOT NULL,
    "passwordEncrypted" TEXT NOT NULL,
    "notes" TEXT,
    "ownerProfileId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Password_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Senhas existentes não tinham dono: atribui todas ao perfil admin. Se não
-- houver admin cadastrado, ownerProfileId fica NULL e o INSERT falha por
-- violar NOT NULL — propositalmente, para não aplicar a migração em silêncio
-- num estado inconsistente.
INSERT INTO "new_Password" ("createdAt", "id", "notes", "passwordEncrypted", "siteName", "updatedAt", "url", "username", "ownerProfileId") SELECT "createdAt", "id", "notes", "passwordEncrypted", "siteName", "updatedAt", "url", "username", (SELECT "id" FROM "Profile" WHERE "role" = 'admin' LIMIT 1) FROM "Password";
DROP TABLE "Password";
ALTER TABLE "new_Password" RENAME TO "Password";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MedicineDoseLog_scheduleId_doseDate_key" ON "MedicineDoseLog"("scheduleId", "doseDate");
