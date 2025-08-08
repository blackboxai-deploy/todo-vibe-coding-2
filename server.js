// Minimal static file server without external dependencies
// Serves files from ./public on PORT env or 1234
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 1234;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveFile(req, res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return notFound(req, res);
      return send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    send(res, 200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }, data);
  });
}

function notFound(req, res) {
  // Try to serve custom 404 if exists
  const custom404 = path.join(PUBLIC_DIR, '404.html');
  fs.access(custom404, fs.constants.F_OK, (existsErr) => {
    if (!existsErr) return serveFile(req, res, custom404);
    send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 Not Found');
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURI(req.url.split('?')[0]);
  let safePath = path.normalize(urlPath).replace(/^\\|^\//, '');
  if (safePath === '') safePath = 'index.html';
  let filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request');
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      if (err.code === 'ENOENT') return notFound(req, res);
      return send(res, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error');
    }

    if (stat.isDirectory()) {
      // If directory, try index.html within
      const indexFile = path.join(filePath, 'index.html');
      return fs.access(indexFile, fs.constants.F_OK, (accessErr) => {
        if (accessErr) return notFound(req, res);
        serveFile(req, res, indexFile);
      });
    }

    serveFile(req, res, filePath);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
