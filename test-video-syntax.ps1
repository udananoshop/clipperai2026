cd d:/ClipperAi2026/backend
try { 
    $null = require('./routes/video.js')
    Write-Host "Video route loaded successfully"
} catch { 
    Write-Host "Error: $_"
}
