-- TITAN-A Database Migration
-- Phase 6: Add decision engine fields to ai_jobs table

-- Add new columns to ai_jobs table (safe migration - nullable, no data loss)
ALTER TABLE ai_jobs ADD COLUMN final_score INTEGER;
ALTER TABLE ai_jobs ADD COLUMN confidence INTEGER;
ALTER TABLE ai_jobs ADD COLUMN priority_level TEXT DEFAULT 'medium';

-- Create index for faster queries on priority_level
CREATE INDEX IF NOT EXISTS idx_ai_jobs_priority ON ai_jobs(priority_level);

-- Create index for faster queries on final_score
CREATE INDEX IF NOT EXISTS idx_ai_jobs_final_score ON ai_jobs(final_score);

-- Migration completed successfully
