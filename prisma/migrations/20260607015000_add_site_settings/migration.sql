CREATE TABLE "SiteSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "siteName" TEXT NOT NULL DEFAULT 'FIFA Sweepstakes',
  "homeEyebrow" TEXT NOT NULL DEFAULT 'FIFA Sweepstakes',
  "homeTitle" TEXT NOT NULL DEFAULT 'Tournament management for FIFA sweepstakes.',
  "homeDescription" TEXT NOT NULL DEFAULT 'Verifiable team draws, live scoring from the official feed, an auto-updating leaderboard, and configurable prize splits.',
  "homePills" TEXT NOT NULL DEFAULT 'Verifiable draws,Live scoring,Configurable prize splits,Self-hosted',
  "infoEyebrow" TEXT NOT NULL DEFAULT 'How it works',
  "infoTitle" TEXT NOT NULL DEFAULT 'Team allocation, scoring, and verification.',
  "infoDescription" TEXT NOT NULL DEFAULT 'How teams are distributed across participants, how points are awarded, and how anyone can independently verify a draw.',
  "footerText" TEXT NOT NULL DEFAULT 'FIFA Sweepstakes · self-hosted tournament management.',
  "logoDataUrl" TEXT,
  "backdropDataUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
