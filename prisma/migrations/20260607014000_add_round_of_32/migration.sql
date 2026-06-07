-- Add ROUND_OF_32 to the MatchStage enum (Postgres enum alteration).
ALTER TYPE "MatchStage" ADD VALUE IF NOT EXISTS 'ROUND_OF_32' AFTER 'GROUP';
