const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create videos table
  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      original_url TEXT,
      file_path TEXT,
      duration REAL,
      status TEXT DEFAULT 'uploaded',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create clips table
  db.run(`
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER,
      start_time REAL,
      end_time REAL,
      title TEXT,
      description TEXT,
      hashtags TEXT,
      viral_score REAL,
      platform TEXT,
      file_path TEXT,
      status TEXT DEFAULT 'created',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // Create subtitles table
  db.run(`
    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER,
      language TEXT DEFAULT 'en',
      content TEXT,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // Create trending_data table
  db.run(`
    CREATE TABLE IF NOT EXISTS trending_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      title TEXT,
      view_count INTEGER,
      published_at DATETIME,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create oauth_tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create ai_jobs table for tracking AI processing pipeline
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      video_id INTEGER,
      video_path TEXT,
      status TEXT DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      current_step TEXT,
      error_message TEXT,
      execution_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      result TEXT,
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // Create ai_results table for storing AI analysis results
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      video_id INTEGER,
      metadata JSON,
      subtitles JSON,
      viral_hook JSON,
      predictions JSON,
      title_and_hashtags JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES ai_jobs (id),
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // =========================================================
  // ENTERPRISE TABLES - User System & Credits
  // =========================================================

  // Plans table
  db.run(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      credits_monthly INTEGER DEFAULT 0,
      max_video_size INTEGER DEFAULT 104857600,
      max_concurrent_jobs INTEGER DEFAULT 1,
      features JSON,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // User profiles table (extended user info)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      credits INTEGER DEFAULT 0,
      credits_used INTEGER DEFAULT 0,
      plan_id INTEGER DEFAULT 1,
      auto_renew INTEGER DEFAULT 1,
      settings JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (plan_id) REFERENCES plans (id)
    )
  `);

  // Usage tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      credits_spent INTEGER NOT NULL,
      metadata JSON,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // =========================================================
  // ENTERPRISE TABLES - AI Analytics
  // =========================================================

  // AI predictions table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      video_id INTEGER,
      job_id TEXT,
      hook_score REAL,
      emotional_intensity REAL,
      trend_alignment REAL,
      confidence_score REAL,
      platform_recommendation TEXT,
      viral_probability REAL,
      predicted_engagement REAL,
      best_timestamp REAL,
      metadata JSON,
      model_version TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // Clip exports table
  db.run(`
    CREATE TABLE IF NOT EXISTS clip_exports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      video_id INTEGER,
      job_id TEXT,
      platform TEXT NOT NULL,
      format TEXT,
      quality TEXT,
      file_size INTEGER,
      export_url TEXT,
      status TEXT DEFAULT 'pending',
      credits_spent INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (video_id) REFERENCES videos (id)
    )
  `);

  // Job history table (persistent)
  db.run(`
    CREATE TABLE IF NOT EXISTS job_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT UNIQUE NOT NULL,
      user_id INTEGER,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      priority INTEGER DEFAULT 3,
      progress INTEGER DEFAULT 0,
      current_step TEXT,
      input_data JSON,
      result_data JSON,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      execution_time_ms INTEGER,
      credits_spent INTEGER DEFAULT 1,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // AI performance stats table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_performance_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      model_version TEXT,
      prediction_type TEXT,
      actual_outcome JSON,
      accuracy_score REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================================================
  // ENTERPRISE TABLES - Autonomous Mode
  // =========================================================

  // User autonomous settings
  db.run(`
    CREATE TABLE IF NOT EXISTS autonomous_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      auto_optimize INTEGER DEFAULT 0,
      auto_title INTEGER DEFAULT 1,
      auto_hashtags INTEGER DEFAULT 1,
      auto_platform_selection INTEGER DEFAULT 1,
      auto_clip_suggestions INTEGER DEFAULT 1,
      preferred_platforms JSON,
      auto_export INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // =========================================================
  // SYSTEM METRICS TABLE
  // =========================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index for metrics queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_system_metrics_name 
    ON system_metrics(metric_name)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_system_metrics_created 
    ON system_metrics(created_at)
  `);

  // =========================================================
  // TITAN-B PHASE 8 - PERFORMANCE TRACKING TABLE
  // =========================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS performance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      final_score INTEGER,
      confidence INTEGER,
      priority_level TEXT DEFAULT 'medium',
      processing_time_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_performance_history_job_id 
    ON performance_history(job_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_performance_history_priority 
    ON performance_history(priority_level)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_performance_history_created 
    ON performance_history(created_at)
  `);

  // =========================================================
  // USER FEEDBACK TABLE
  // =========================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS prediction_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      feedback_type TEXT NOT NULL,
      actual_value REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prediction_id) REFERENCES ai_predictions (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // =========================================================
  // OVERLORD PHASE 5 - AI LEARNING MEMORY TABLE
  // =========================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_learning_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      predicted_score REAL NOT NULL,
      actual_performance REAL NOT NULL,
      adjustment_applied REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_ai_learning_memory_job_id 
    ON ai_learning_memory(job_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_ai_learning_memory_created 
    ON ai_learning_memory(created_at)
  `);

  // =========================================================
  // OVERLORD PHASE 7 - INTELLIGENCE TELEMETRY TABLE
  // =========================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_telemetry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_telemetry_job_id 
    ON ai_telemetry_logs(job_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_telemetry_event_type 
    ON ai_telemetry_logs(event_type)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_telemetry_created 
    ON ai_telemetry_logs(created_at)
  `);

  // =========================================================
  // SEED DEFAULT PLANS
  // =========================================================
  db.run(`
    INSERT OR IGNORE INTO plans (id, name, display_name, description, price, credits_monthly, max_video_size, max_concurrent_jobs, features, is_active)
    VALUES 
    (1, 'free', 'Free', 'Free tier for testing', 0, 10, 104857600, 1, '{"basic_ai": true, "exports": 3}', 1),
    (2, 'pro', 'Pro', 'Pro plan for creators', 9.99, 100, 524288000, 3, '{"basic_ai": true, "advanced_ai": true, "exports": 20, "priority_support": true}', 1),
    (3, 'studio', 'Studio', 'Studio plan for agencies', 29.99, 500, 2147483648, 10, '{"basic_ai": true, "advanced_ai": true, "premium_ai": true, "unlimited_exports": true, "priority_support": true, "api_access": true}', 1)
  `);

  console.log('Enterprise database initialized.');
}

// =========================================================
// OVERLORD 9.5 - LIGHTWEIGHT PREDICTION HISTORY TABLE
// =========================================================
db.run(`
  CREATE TABLE IF NOT EXISTS prediction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    platform TEXT NOT NULL,
    score INTEGER NOT NULL,
    category TEXT,
    duration INTEGER,
    hook_strength INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE INDEX IF NOT EXISTS idx_prediction_history_created 
  ON prediction_history(created_at)
`);

module.exports = db;
