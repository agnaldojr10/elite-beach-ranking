-- AlterEnum
ALTER TYPE "MatchPhase" ADD VALUE 'QUARTAS';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "slot" INTEGER;
