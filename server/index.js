import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extname, join } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as admin from './routes/admin.js';
import * as status from './routes/status.js';
import * as overview from './routes/status-overview.js';
import * as panels from './routes/panel-status.js';
import * as photos from './routes/portfolio.js';
import * as videos from './routes/videos.js';
import * as asset from './routes/asset.js';

const routes = new Map([['/api/admin', admin], ['/api/status', status], ['/api/status-overview', overview], ['/api/panel-status', panels], ['/api/portfolio', photos], ['/api/videos', videos]]);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const error = (message, code, headers = {}) => Response.json({ error: message }, { status: code, headers: { 'Cache-Control': 'no-store', ...headers } });
const accepts = (header, name) => header.split(',').some(value => {
  const [encoding, ...parameters] = value.trim().split(';');
  return encoding === name && !parameters.some(p => /^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(p));
});

async function loadFiles(directory, prefix = '', files = new Map()) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name), url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) { await loadFiles(path, url, files); continue; }
    if (!entry.isFile() || !mime[extname(path)]) continue;
    const raw = await readFile(path);
    files.set(url, { raw, gzip: gzipSync(raw), br: brotliCompressSync(raw), type: mime[extname(path)], etag: `W/"${createHash('sha256').update(raw).digest('hex')}"` });
  }
  return files;
}

export async function createApplicationServer({ publicRoot = fileURLToPath(new URL('../public/', import.meta.url)) } = {}) {
  const files = await loadFiles(publicRoot);
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      const requestPath = decodeURIComponent(url.pathname);
      let response;
      const handler = routes.get(requestPath) || (/^\/api\/portfolio\/asset\/[^/]+$/.test(requestPath) ? asset : undefined);
      if (handler) {
        const method = req.method === 'HEAD' ? 'GET' : req.method;
        if (!handler[method]) response = error('Method not allowed', 405, { Allow: Object.keys(handler).join(', ') });
        else {
          const chunks = [];
          let size = 0;
          if (!['GET', 'HEAD'].includes(req.method)) {
            for await (const chunk of req.iterator({ destroyOnReturn: false })) {
              size += chunk.length;
              if (size > 16_384) { response = error('Request too large', 413); req.resume(); break; }
              chunks.push(chunk);
            }
          }
          if (!response) {
            const request = new Request(url, { method, headers: req.headers,
              ...(!['GET', 'HEAD'].includes(method) ? { body: Buffer.concat(chunks) } : {}) });
            response = await handler[method](request, { params: Promise.resolve({ id: requestPath.split('/').at(-1) }) });
          }
        }
      } else if (requestPath.startsWith('/api/')) response = error('Not found', 404);
      else if (!['GET', 'HEAD'].includes(req.method)) response = error('Method not allowed', 405, { Allow: 'GET, HEAD' });
      else {
        const file = files.get(requestPath) || files.get(`${requestPath.replace(/\/$/, '')}/index.html`);
        if (!file) response = error('Not found', 404);
        else {
          res.setHeader('Content-Type', file.type);
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('ETag', file.etag);
          res.setHeader('Vary', 'Accept-Encoding');
          if (req.headers['if-none-match'] === file.etag) { res.writeHead(304); res.end(); return; }
          const accepted = req.headers['accept-encoding'] || '';
          const encoding = accepts(accepted, 'br') ? 'br' : accepts(accepted, 'gzip') ? 'gzip' : null;
          const body = encoding ? file[encoding] : file.raw;
          if (encoding) res.setHeader('Content-Encoding', encoding);
          res.setHeader('Content-Length', body.length);
          res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : body); return;
        }
      }
      for (const [key, value] of response.headers) res.setHeader(key, value);
      res.writeHead(response.status);
      if (req.method === 'HEAD' || !response.body) { await response.body?.cancel(); res.end(); }
      else await pipeline(Readable.fromWeb(response.body), res);
    } catch {
      if (!res.headersSent) { res.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('{"error":"Request unavailable"}'); }
      else res.destroy();
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createApplicationServer();
  const port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => console.log(`MX11 listening on http://${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
