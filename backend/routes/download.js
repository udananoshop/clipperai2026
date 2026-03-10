// 🔒 LOCKED MODULE - OVERLORD STABLE VERSION
// Upload & Download System - FINAL
// DO NOT MODIFY WITHOUT ISOLATED TEST ENVIRONMENT

const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');
const PYTHON_PATH = process.platform === 'win32' ? 'python' : 'python3';

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing URL' });
    }

    const outputPath = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');

    execFile(PYTHON_PATH, [
      '-m',
      'yt_dlp',
      url,
      '-o',
      outputPath
    ], (error, stdout, stderr) => {

      if (error) {
        console.error("YT-DLP ERROR:", stderr);
        return res.status(500).json({ error: "Download failed" });
      }

      return res.json({ success: true });
    });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    return res.status(500).json({ error: "Download crashed" });
  }
});

module.exports = router;
