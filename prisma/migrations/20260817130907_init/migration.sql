-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('REGULAR', 'GUEST');

-- CreateEnum
CREATE TYPE "ChampionshipStatus" AS ENUM ('ATIVA', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ABERTA', 'SORTEADA', 'ENCERRADA', 'AGENDADA');

-- CreateEnum
CREATE TYPE "MatchPhase" AS ENUM ('GRUPOS', 'SEMIFINAL', 'FINAL', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDENTE', 'JOGADO');

-- CreateEnum
CREATE TYPE "ResultTier" AS ENUM ('CAMPEAO', 'VICE', 'TERCEIRO', 'QUARTO', 'QUARTAS', 'PARTICIPACAO');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "type" "PlayerType" NOT NULL DEFAULT 'REGULAR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Championship" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "temporada" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "status" "ChampionshipStatus" NOT NULL DEFAULT 'ATIVA',
    "inicio" DATE NOT NULL,
    "fim" DATE NOT NULL,
    "finalsDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ptsParticipacao" INTEGER NOT NULL DEFAULT 10,
    "ptsQuartas" INTEGER NOT NULL DEFAULT 20,
    "pts4" INTEGER NOT NULL DEFAULT 40,
    "pts3" INTEGER NOT NULL DEFAULT 60,
    "ptsVice" INTEGER NOT NULL DEFAULT 80,
    "ptsCampeao" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "Championship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "championshipId" TEXT NOT NULL,
    "numero" INTEGER,
    "data" DATE NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'ABERTA',
    "peso" INTEGER NOT NULL DEFAULT 1,
    "isFinals" BOOLEAN NOT NULL DEFAULT false,
    "drawGroupSize" INTEGER NOT NULL DEFAULT 3,
    "drawBalanceByRanking" BOOLEAN NOT NULL DEFAULT true,
    "drawAvoidRepeat" BOOLEAN NOT NULL DEFAULT true,
    "drawRandomness" INTEGER NOT NULL DEFAULT 60,
    "configConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "duplasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "grupo" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "phase" "MatchPhase" NOT NULL,
    "grupo" TEXT,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT NOT NULL,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tier" "ResultTier" NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Round_championshipId_idx" ON "Round"("championshipId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_championshipId_numero_key" ON "Round"("championshipId", "numero");

-- CreateIndex
CREATE INDEX "Team_roundId_idx" ON "Team"("roundId");

-- CreateIndex
CREATE INDEX "Match_roundId_idx" ON "Match"("roundId");

-- CreateIndex
CREATE INDEX "RoundResult_playerId_idx" ON "RoundResult"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_roundId_playerId_key" ON "RoundResult"("roundId", "playerId");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundResult" ADD CONSTRAINT "RoundResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
