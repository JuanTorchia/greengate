-- DropIndex
DROP INDEX "Approval_authReqId_key";

-- CreateIndex
CREATE INDEX "Approval_authReqId_idx" ON "Approval"("authReqId");
