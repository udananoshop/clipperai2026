-- TITAN-B Phase 8 - Performance Tracking System
-- Performance history table for tracking job processing metrics

-- Create performance_history table
CREATE TABLE IF NOT EXISTS performance_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  final_score INTEGER,
  confidence INTEGER,
  priority_level TEXT DEFAULT 'medium',
  processing_time_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_performance_history_job_id ON performance_history(job_id);
CREATE INDEX IF NOT EXISTS idx_performance_history_priority ON performance_history(priority_level);
CREATE INDEX IF NOT EXISTS idx_performance_history_created ON performance_history(created_at);

-- Migration completed successfully
