const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const prisma = require('../prisma/client');

const ytdlpPath = "python";
console.log("🔥 YTDLP FINAL PATH:", ytdlpPath);

class UploadService {
  constructor() {
    this.tokens = {
      youtube: null,
      facebook: null,
      instagram: null,
      tiktok: null
    };
    this.loadTokens();
  }

  async saveVideoToDB(data) {
    return await prisma.video.create({
      data: {
        title: data.title,
        filename: data.filename,
        platform: data.platform || 'local',
        viralScore: 0
      }
    });
  }

  loadTokens() {
    // Load tokens from database or environment
    // This is a simplified version - in production, load from secure storage
    this.tokens.youtube = process.env.YOUTUBE_ACCESS_TOKEN;
    this.tokens.facebook = process.env.FACEBOOK_ACCESS_TOKEN;
    this.tokens.instagram = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.tokens.tiktok = process.env.TIKTOK_ACCESS_TOKEN;
  }

  async uploadToYouTube(videoPath, metadata) {
    try {
      // YouTube Data API v3 upload
      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('snippet', JSON.stringify({
        title: metadata.title,
        description: metadata.description,
        tags: metadata.hashtags,
        categoryId: '22' // People & Blogs
      }));

      const response = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        formData,
        {
          params: {
            uploadType: 'multipart',
            part: 'snippet,status',
            key: process.env.YOUTUBE_API_KEY
          },
          headers: {
            'Authorization': `Bearer ${this.tokens.youtube}`,
            ...formData.getHeaders()
          }
        }
      );

      return { success: true, videoId: response.data.id };
    } catch (error) {
      console.error('YouTube upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadToFacebook(videoPath, metadata) {
    try {
      const formData = new FormData();
      formData.append('source', fs.createReadStream(videoPath));
      formData.append('description', metadata.description);

      const response = await axios.post(
        `https://graph.facebook.com/v18.0/me/videos`,
        formData,
        {
          params: {
            access_token: this.tokens.facebook
          },
          headers: formData.getHeaders()
        }
      );

      return { success: true, postId: response.data.id };
    } catch (error) {
      console.error('Facebook upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadToInstagram(videoPath, metadata) {
    try {
      // Instagram Business API upload
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
        {
          media_type: 'VIDEO',
          video_url: `file://${videoPath}`, // In production, upload to cloud storage first
          caption: metadata.description
        },
        {
          params: {
            access_token: this.tokens.instagram
          }
        }
      );

      // Publish the media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
        {
          creation_id: containerResponse.data.id
        },
        {
          params: {
            access_token: this.tokens.instagram
          }
        }
      );

      return { success: true, mediaId: publishResponse.data.id };
    } catch (error) {
      console.error('Instagram upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadToTikTok(videoPath, metadata) {
    try {
      // TikTok upload API (simplified - actual implementation requires TikTok's SDK)
      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('description', metadata.description);

      const response = await axios.post(
        'https://open-api.tiktok.com/share/video/upload/',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.tokens.tiktok}`,
            ...formData.getHeaders()
          }
        }
      );

      return { success: true, videoId: response.data.data.video_id };
    } catch (error) {
      console.error('TikTok upload error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadToPlatform(platform, videoPath, metadata) {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return this.uploadToYouTube(videoPath, metadata);
      case 'facebook':
        return this.uploadToFacebook(videoPath, metadata);
      case 'instagram':
        return this.uploadToInstagram(videoPath, metadata);
      case 'tiktok':
        return this.uploadToTikTok(videoPath, metadata);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // OAuth flow helpers
  getAuthUrl(platform) {
    const urls = {
      youtube: `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&client_id=${process.env.YOUTUBE_CLIENT_ID}`,
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?scope=pages_manage_posts,pages_show_list&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&client_id=${process.env.FACEBOOK_APP_ID}`,
      instagram: `https://api.instagram.com/oauth/authorize?scope=user_profile,user_media&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&client_id=${process.env.INSTAGRAM_APP_ID}`,
      tiktok: `https://www.tiktok.com/auth/authorize?scope=user.info.basic,video.upload&response_type=code&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&client_id=${process.env.TIKTOK_CLIENT_ID}`
    };
    return urls[platform.toLowerCase()];
  }

  async exchangeCodeForToken(platform, code) {
    // Implement token exchange for each platform
    // This would typically involve server-side token exchange
    console.log(`Exchanging code for ${platform} token`);
    // Store token securely
    return { success: true, token: 'mock_token' };
  }

  async downloadFromUrl(url) {
    return new Promise((resolve, reject) => {

      const uploadsDir = path.resolve(__dirname, '../uploads');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const outputPath = path.join(
        uploadsDir,
        `video_${Date.now()}.%(ext)s`
      );

      console.log("Using Python yt-dlp");
      console.log("Saving to:", outputPath);

      const ytdlp = spawn("python", [
        "-m",
        "yt_dlp",
        url,
        "-o",
        outputPath,
        "-f",
        "best[height<=720]"
      ]);

      ytdlp.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      ytdlp.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          console.log("Download selesai");
          resolve("Download sukses");
        } else {
          reject(`yt-dlp exited with code ${code}`);
        }
      });

    });
  }

}

module.exports = new UploadService();
