-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('AWAITING_REVIEW', 'IN_REVIEW', 'CLEARED');

-- AlterTable
ALTER TABLE "AuditRun" ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'AWAITING_REVIEW',
ADD COLUMN     "slaDueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "responsibleApproverName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "responsibleApproverRole" TEXT NOT NULL DEFAULT '';
