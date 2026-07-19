CREATE TYPE "Language" AS ENUM ('ES', 'EN');

ALTER TABLE "users"
ADD COLUMN "preferredLanguage" "Language" NOT NULL DEFAULT 'ES';

ALTER TABLE "ticket_comments"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "ticket_comments"
ADD CONSTRAINT "ticket_comments_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "attachments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "noteId" TEXT,
  "ticketId" TEXT,
  "ticketCommentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attachments_organizationId_idx" ON "attachments"("organizationId");
CREATE INDEX "attachments_noteId_idx" ON "attachments"("noteId");
CREATE INDEX "attachments_ticketId_idx" ON "attachments"("ticketId");
CREATE INDEX "attachments_ticketCommentId_idx" ON "attachments"("ticketCommentId");

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_noteId_fkey"
FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticketCommentId_fkey"
FOREIGN KEY ("ticketCommentId") REFERENCES "ticket_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
