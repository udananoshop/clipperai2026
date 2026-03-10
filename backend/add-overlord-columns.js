// Add OVERLORD column to ai_jobs table
const db = require('./database');

console.log('Adding OVERLORD column to ai_jobs table...');

db.run('ALTER TABLE ai_jobs ADD COLUMN ai_refined_score INTEGER', function(err) {
  if (err && !err.message.includes('duplicate column')) {
    console.log('ai_refined_score:', err.message);
  } else {
    console.log('ai_refined_score: OK');
  }
  
  console.log('\nOVERLORD column migration complete.');
  process.exit(0);
});
