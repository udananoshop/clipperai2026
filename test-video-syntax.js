const path = require('path');

try {
    // Use absolute path to the video route
    const videoRouter = require(path.join(__dirname, 'backend', 'routes', 'video.js'));
    console.log('Video route loaded successfully');
    console.log('Router type:', typeof videoRouter);
    console.log('Stack length:', videoRouter.stack ? videoRouter.stack.length : 'N/A');
} catch(e) {
    console.error('Error:', e.message);
}
