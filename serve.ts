// Tiny local static server for the Surya Bay game folder.
// Usage: node serve.ts [--port 8080]  →  http://localhost:8080
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const argv = process.argv.slice(2);
const portFlag = argv.indexOf('--port');
const wantedPort = portFlag === -1 ? 8080 : Number(argv[portFlag + 1]);
const port = Number.isInteger(wantedPort) && wantedPort > 0 && wantedPort < 65536 ? wantedPort : 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { res.writeHead(400).end('bad'); return; }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(gameRoot, normalize(path)));
  if (file !== gameRoot && !file.startsWith(gameRoot + sep)) { res.writeHead(403).end('forbidden'); return; }
  let bytes;
  try { const st = statSync(file); if (!st.isFile()) throw 0; bytes = st.size; }
  catch { res.writeHead(404).end('missing'); return; }
  res.writeHead(200, {
    'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': bytes, 'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('Surya Bay on http://localhost:' + port));
