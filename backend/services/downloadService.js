const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_PATH = "C:\\Users\\rokha\\AppData\\Local\\Programs\\Python\\Python311\\python.exe";

class DownloadService {

  async downloadVideo(url, outputDir = path.join(__dirname, '../uploads'), options = {}) {
    return new Promise((resolve, reject) => {

      const timestamp = Date.now();
      const filenameTemplate = `video_${timestamp}.%(ext)s`;
      const outputPath = path.join(outputDir, filenameTemplate);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const args = [
        "-m",
        "yt_dlp",
        url,
        "-o",
        outputPath,
        "-f",
        options.format || "best[height<=720]"
      ];

      console.log("Using Python:", PYTHON_PATH);
      console.log("Running:", PYTHON_PATH, args.join(" "));

      const processYt = spawn(PYTHON_PATH, args);

      processYt.stdout.on("data", data => {
        console.log(`stdout: ${data}`);
      });

      processYt.stderr.on("data", data => {
        console.error(`stderr: ${data}`);
      });

      processYt.on("close", code => {
        if (code === 0) {

          const files = fs.readdirSync(outputDir);
          const downloadedFile = files.find(file =>
            file.startsWith(`video_${timestamp}`)
          );

          if (!downloadedFile) {
            return reject(new Error("Downloaded file not found"));
          }

          resolve({
            success: true,
            filePath: path.join(outputDir, downloadedFile),
            filename: downloadedFile,
            url
          });

        } else {
          reject(new Error(`yt-dlp exited with code ${code}`));
        }
      });

    });
  }

  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {

      const args = [
        "-m",
        "yt_dlp",
        "--dump-json",
        url
      ];

      const processYt = spawn(PYTHON_PATH, args);

      let dataBuffer = "";

      processYt.stdout.on("data", data => {
        dataBuffer += data.toString();
      });

      processYt.stderr.on("data", data => {
        console.error(`stderr: ${data}`);
      });

      processYt.on("close", code => {
        if (code === 0) {
          try {
            const info = JSON.parse(dataBuffer);
            resolve({
              title: info.title,
              duration: info.duration,
              uploader: info.uploader,
              viewCount: info.view_count,
              uploadDate: info.upload_date,
              thumbnail: info.thumbnail
            });
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("Failed to get video info"));
        }
      });

    });
  }

  async isValidUrl(url) {
    return new Promise((resolve) => {

      const args = [
        "-m",
        "yt_dlp",
        "--dump-json",
        "--skip-download",
        "--no-warnings",
        url
      ];

      const processYt = spawn(PYTHON_PATH, args);

      processYt.on("close", code => {
        resolve(code === 0);
      });

    });
  }

}

module.exports = new DownloadService();
