-- Renomeia a config do sorteio: tamanho do grupo -> número de grupos
ALTER TABLE "Round" RENAME COLUMN "drawGroupSize" TO "drawNumGroups";
