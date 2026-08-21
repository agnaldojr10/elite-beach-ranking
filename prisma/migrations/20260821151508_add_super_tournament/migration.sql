-- CreateEnum
CREATE TYPE "SuperStatus" AS ENUM ('ABERTO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "SuperTournament" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "size" INTEGER NOT NULL,
    "courts" INTEGER NOT NULL DEFAULT 2,
    "gamesPerMatch" INTEGER NOT NULL DEFAULT 7,
    "status" "SuperStatus" NOT NULL DEFAULT 'ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperTournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,

    CONSTRAINT "SuperPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "rodada" INTEGER NOT NULL,
    "quadra" INTEGER NOT NULL,
    "a1" INTEGER NOT NULL,
    "a2" INTEGER NOT NULL,
    "b1" INTEGER NOT NULL,
    "b2" INTEGER NOT NULL,
    "scoreA" INTEGER,
    "scoreB" INTEGER,

    CONSTRAINT "SuperMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SuperPlayer_tournamentId_idx" ON "SuperPlayer"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperPlayer_tournamentId_playerId_key" ON "SuperPlayer"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SuperPlayer_tournamentId_seat_key" ON "SuperPlayer"("tournamentId", "seat");

-- CreateIndex
CREATE INDEX "SuperMatch_tournamentId_idx" ON "SuperMatch"("tournamentId");

-- AddForeignKey
ALTER TABLE "SuperPlayer" ADD CONSTRAINT "SuperPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SuperTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperPlayer" ADD CONSTRAINT "SuperPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuperMatch" ADD CONSTRAINT "SuperMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SuperTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
