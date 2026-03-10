const prisma = require('../prisma/client');
const downloadService = require('../services/downloadService');
const clipService = require('../services/clipService');
const subtitleService = require('../services/subtitleService');
const predictionService = require('../services/predictionService');
const hashtagService = require('../services/hashtagService');
const fs = require('fs');
const path = require('path');

// Get backend URL from environment or use default
const getBaseUrl = () => {
  return process.env.BACKEND_URL || 'http://localhost:3001';
};

// Helper to convert file path to full URL
const toFullUrl = (filePath) => {
  if (!filePath) return null;
  // If already has full URL, return as is
  if (filePath.startsWith('http')) return filePath;
  // Add base URL prefix
  return `${getBaseUrl()}${filePath}`;
};

class VideoController {
  // Upload video - FINAL: only save file + DB, NO AI trigger
  async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
      }

      const { title } = req.body;
      const userId = req.user?.id || 1;

      const video = await prisma.video.create({
        data: {
          title: title || req.file.originalname,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          userId: userId
        }
      });

      // FINAL: NO AI trigger, NO generateClips
      // AI only runs when user clicks manually

      return res.status(201).json({
        success: true,
        data: {
          id: video.id,
          title: video.title,
          filename: video.filename,
          originalName: video.originalName,
          size: video.size,
          createdAt: video.createdAt
        }
      });

    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // Get videos - FINAL: only DB, NO fs.existsSync fallback
  async getVideos(req, res) {
    try {
      const userId = req.user?.id || 1;

      // FINAL: Just return data from database
      const videos = await prisma.video.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // Transform file paths to full URLs for frontend
      const videosWithUrls = (videos || []).map(video => ({
        ...video,
        filename: toFullUrl(`/uploads/${video.filename}`)
      }));

      res.json({
        success: true,
        data: videosWithUrls || []
      });

    } catch (error) {
      console.error('[getVideos] Error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // Stream video - FINAL: no prisma error on missing file
  async streamVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;

      const video = await prisma.video.findFirst({
        where: {
          id: parseInt(id),
          userId: userId
        }
      });

      if (!video) {
        return res.status(404).json({ success: false, error: 'Video not found in DB' });
      }

      // Try multiple paths
      const possiblePaths = [
        path.join(__dirname, '../uploads/videos', video.filename),
        path.join(__dirname, '../uploads', video.filename),
        path.join(process.cwd(), 'uploads/videos', video.filename),
        path.join(process.cwd(), 'uploads', video.filename),
      ];

      let videoPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          videoPath = p;
          break;
        }
      }

      if (!videoPath) {
        // FINAL: No error, just say file missing
        return res.status(404).json({ success: false, error: 'Video file not found on disk' });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const file = fs.createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
        });

        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        });

        fs.createReadStream(videoPath).pipe(res);
      }

    } catch (err) {
      console.error("STREAM ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    }
  }

  // Download video from URL
  async downloadVideo(req, res) {
    try {
      const { url, options } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      const result = await downloadService.downloadVideo(
        url,
        './uploads',
        options || {}
      );

      const db = require('../database');
      db.run(
        `INSERT INTO videos (title, original_url, file_path, status)
        VALUES (?, ?, ?, ?)`,
        [result.filename, url, result.filePath, 'downloaded'],
        async function (err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to save video'
            });
          }

          const videoId = this.lastID;

          const startTime = 30;
          const duration = 45;
          const endTime = startTime + duration;

          const outputDir = './output';
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputFilename = `clip_${Date.now()}.mp4`;
          const physicalOutputPath = `${outputDir}/${outputFilename}`;
          const publicOutputPath = `/output/${outputFilename}`;

          await clipService.createClip(
            result.filePath,
            physicalOutputPath,
            startTime,
            duration,
            { aspectRatio: '9:16' }
          );

          let viralResult = { score: 50 };
          let hashtags = [];

          try {
            viralResult = await predictionService.calculateViralScore('', result.filename);
            hashtags = await hashtagService.generateHashtags(result.filename, 'tiktok');
          } catch (e) {
            console.log("AI failed, using fallback");
          }

          db.run(
            `INSERT INTO clips (video_id, start_time, end_time, title, hashtags, viral_score, platform, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              videoId,
              startTime,
              endTime,
              result.filename,
              JSON.stringify(hashtags),
              viralResult.score,
              'tiktok',
              publicOutputPath
            ],
            function(err) {
              if (err) {
                console.error("Clip insert error:", err);
                return res.status(500).json({
                  success: false,
                  error: "Failed to save clip"
                });
              }

              return res.json({
                success: true,
                message: "Video downloaded and clip auto-generated",
                data: {
                  video: result,
                  clipId: this.lastID,
                  clipPath: publicOutputPath
                }
              });
            }
          );
        }
      );

    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // Get all videos (legacy)
  async getAllVideos(req, res) {
    const db = require('../database');
    db.all('SELECT * FROM videos ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch videos'
        });
      }

      res.json({
        success: true,
        data: rows
      });
    });
  }

  // Create clip (manual AI)
  async createClip(req, res) {
    try {
      const { videoId, startTime, endTime, title, platform } = req.body;

      if (!videoId || startTime == null || endTime == null) {
        return res.status(400).json({
          success: false,
          error: 'Video ID, start time, and end time are required'
        });
      }

      const db = require('../database');
      db.get('SELECT * FROM videos WHERE id = ?', [videoId], async (err, video) => {
        if (err || !video) {
          return res.status(404).json({
            success: false,
            error: 'Video not found'
          });
        }

        const duration = endTime - startTime;
        const outputFilename = `clip_${Date.now()}.mp4`;
        const outputDir = './output';

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const physicalOutputPath = `${outputDir}/${outputFilename}`;
        const publicOutputPath = `/output/${outputFilename}`;

        const aspectRatio =
          platform === 'tiktok' || platform === 'instagram'
            ? '9:16'
            : '16:9';

        const physicalVideoPath = `.${video.file_path}`;

        await clipService.createClip(
          physicalVideoPath,
          physicalOutputPath,
          startTime,
          duration,
          { aspectRatio }
        );

        // Manual AI
        const viralResult = await predictionService.calculateViralScore(
          '',
          title || video.title
        );

        const hashtags = await hashtagService.generateHashtags(
          title || video.title,
          platform
        );

        db.run(
          `INSERT INTO clips (video_id, start_time, end_time, title, hashtags, viral_score, platform, file_path)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            videoId,
            startTime,
            endTime,
            title || video.title,
            JSON.stringify(hashtags),
            viralResult.score,
            platform,
            publicOutputPath
          ],
          function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                error: 'Failed to save clip'
              });
            }

            res.status(201).json({
              success: true,
              data: {
                id: this.lastID,
                filePath: toFullUrl(publicOutputPath),
                viralScore: viralResult.score,
                hashtags
              }
            });
          }
        );
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // Get all clips
  async getClips(req, res) {
    const db = require('../database');
    db.all('SELECT * FROM clips ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch clips'
        });
      }

      // Transform file paths to full URLs for frontend
      const clipsWithUrls = (rows || []).map(clip => {
        // Get file path - PRIORITIZE filePath field (new format), fall back to file_path or filename
        let filePath = clip.filePath || clip.file_path || clip.filename;
        
        // Convert to URL - ensure it starts with / for relative paths
        let urlPath = filePath;
        if (filePath && !filePath.startsWith('http')) {
          // If it's just a filename without path, add /output/ prefix
          if (!filePath.startsWith('output/') && !filePath.startsWith('/output/') && !filePath.startsWith('/')) {
            urlPath = '/output/' + filePath;
          } else if (!filePath.startsWith('/')) {
            urlPath = '/' + filePath;
          }
        }
        
        return {
          ...clip,
          // Return both field names for compatibility
          filePath: toFullUrl(urlPath),
          file_path: toFullUrl(urlPath),
          // Convert viral_score to viralScore for Prisma compatibility
          viralScore: clip.viral_score || clip.viralScore,
          viral_score: clip.viral_score || clip.viralScore
        };
      });

      res.json({
        success: true,
        data: clipsWithUrls
      });
    });
  }

  // Generate subtitles (manual AI)
  async generateSubtitles(req, res) {
    try {
      const { videoId, language } = req.body;

      const db = require('../database');
      db.get('SELECT * FROM videos WHERE id = ?', [videoId], async (err, video) => {
        if (err || !video) {
          return res.status(404).json({
            success: false,
            error: 'Video not found'
          });
        }

        const result = await subtitleService.generateSubtitles(video.file_path, language || 'en');

        db.run(
          `INSERT INTO subtitles (video_id, language, content, file_path)
           VALUES (?, ?, ?, ?)`,
          [videoId, result.language, result.content, result.subtitlePath],
          function(err) {
            if (err) {
              console.error('Database error:', err);
            }
          }
        );

        res.json({
          success: true,
          data: result
        });
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }

  // Get stats
  async getStats(req, res) {
    const db = require('../database');
    db.get(`SELECT COUNT(*) as total FROM videos`, [], (err, videoCount) => {
      if (err) return res.status(500).json({ success: false });

      db.get(`SELECT COUNT(*) as total FROM clips`, [], (err2, clipCount) => {
        if (err2) return res.status(500).json({ success: false });

        db.get(`SELECT AVG(viral_score) as avgScore FROM clips`, [], (err3, avg) => {
          if (err3) return res.status(500).json({ success: false });

          res.json({
            success: true,
            data: {
              totalVideos: videoCount.total,
              totalClips: clipCount.total,
              avgScore: Math.round(avg.avgScore || 0)
            }
          });
        });
      });
    });
  }

  // Delete video - SAFE DELETE (Delete clips first, then video, then physical file)
  async deleteVideo(req, res) {
    try {
      const { id } = req.params;
      const videoId = parseInt(id);

      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: { clips: true }
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found"
        });
      }

      // 1. Delete child relations FIRST (clips)
      await prisma.clip.deleteMany({
        where: { videoId: video.id }
      });

      // 2. Delete main video
      await prisma.video.delete({
        where: { id: video.id }
      });

      // 3. Delete physical file
      if (video.filename) {
        try {
          const possiblePaths = [
            path.join(__dirname, '../uploads/videos', video.filename),
            path.join(__dirname, '../uploads', video.filename),
            path.join(process.cwd(), 'uploads/videos', video.filename),
            path.join(process.cwd(), 'uploads', video.filename),
          ];

          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              break;
            }
          }
        } catch (fileError) {
          console.log(`Physical file deletion skipped:`, fileError.message);
        }
      }

      return res.json({
        success: true,
        message: "Video deleted permanently"
      });

    } catch (error) {
      console.error("DELETE ERROR:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Bulk delete videos - CLEAN DELETE (No soft delete, no deletedAt)
  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const userId = req.user?.id || 1;

      // Validate input
      if (!Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          error: 'ids must be an array'
        });
      }

      if (ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ids array cannot be empty'
        });
      }

      let deletedCount = 0;

      // Process each ID
      for (const idStr of ids) {
        const id = parseInt(idStr);
        if (isNaN(id)) continue;

        try {
          const video = await prisma.video.findFirst({
            where: {
              id: id,
              userId: userId
            }
          });

          if (video) {
            // 1. Delete clips first
            await prisma.clip.deleteMany({
              where: { videoId: video.id }
            });

            // 2. Delete video
            await prisma.video.delete({
              where: { id }
            });

            // 3. Delete physical file
            try {
              const possiblePaths = [
                path.join(__dirname, '../uploads/videos', video.filename),
                path.join(__dirname, '../uploads', video.filename),
                path.join(process.cwd(), 'uploads/videos', video.filename),
                path.join(process.cwd(), 'uploads', video.filename),
              ];

              for (const filePath of possiblePaths) {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  break;
                }
              }
            } catch (fileError) {
              console.log(`File deletion skipped for video ${id}:`, fileError.message);
            }

            deletedCount++;
          }
        } catch (error) {
          console.error(`Error deleting video ${id}:`, error.message);
          // Continue with other videos
        }
      }

      return res.json({
        success: true,
        deletedCount
      });

    } catch (error) {
      console.error("BULK DELETE ERROR:", error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

}

module.exports = new VideoController();
