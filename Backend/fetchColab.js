// Node.js Express endpoint to fetch a public Colab notebook (.ipynb) from Google Drive
// and return its cells as JSON (no authentication required)

const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const router = express.Router();

// Helper to download a file from a public Google Drive link, following redirects
function downloadWithRedirects(url, destPath, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let redirects = 0;
    function requestUrl(currentUrl) {
      const mod = currentUrl.startsWith('https') ? https : http;
      mod.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          if (redirects >= maxRedirects) {
            return reject(new Error('Too many redirects'));
          }
          redirects++;
          requestUrl(response.headers.location.startsWith('http') ? response.headers.location : new URL(response.headers.location, currentUrl).toString());
        } else if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => file.close(() => resolve(destPath)));
        } else {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
      }).on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    }
    requestUrl(url);
  });
}

router.get('/api/fetch_colab', async (req, res) => {
  const { file_id } = req.query;
  if (!file_id) {
    return res.status(400).json({ success: false, error: 'Missing file_id' });
  }
  const tempDir = path.join(__dirname, 'tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const destPath = path.join(tempDir, `${file_id}.ipynb`);
  const url = `https://drive.google.com/uc?export=download&id=${file_id}`;

  try {
    await downloadWithRedirects(url, destPath);
    const fileContent = fs.readFileSync(destPath, 'utf-8');
    const notebook = JSON.parse(fileContent);
    // Clean up temp file
    fs.unlinkSync(destPath);
    if (!notebook.cells) {
      return res.status(500).json({ success: false, error: 'No cells found in notebook.' });
    }
    return res.json({ success: true, cells: notebook.cells });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.toString() });
  }
});

module.exports = router;
