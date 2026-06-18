/*
  Warnings:

  - A unique constraint covering the columns `[sharingToken]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharedAt" TIMESTAMP(3),
ADD COLUMN     "sharingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_sharingToken_key" ON "Document"("sharingToken");
