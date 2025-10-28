-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "otherName" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "dob" DATETIME NOT NULL,
    "accountType" TEXT,
    "securityQuestion" TEXT,
    "securityAnswer" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "suspended" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("accountType", "address", "createdAt", "dob", "email", "firstName", "id", "lastName", "otherName", "password", "phone", "role", "securityAnswer", "securityQuestion", "updatedAt") SELECT "accountType", "address", "createdAt", "dob", "email", "firstName", "id", "lastName", "otherName", "password", "phone", "role", "securityAnswer", "securityQuestion", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
