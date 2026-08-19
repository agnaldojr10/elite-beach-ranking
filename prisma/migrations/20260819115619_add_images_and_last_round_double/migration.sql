-- AlterTable
ALTER TABLE "Championship" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "lastRoundDouble" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "photoUrl" TEXT;
