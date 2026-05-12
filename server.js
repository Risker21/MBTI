const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { fetchUpstream } = require('./api/_lib/mbtiUpstream');

// ---- 加载 .env ----
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const API_ID = process.env.API_ID;
const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

if (!API_ID || !API_KEY) {
  console.error('错误：请在 .env 文件中配置 API_ID 和 API_KEY');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(obj));
}

async function proxyMbti(upstreamPath, res, logPrefix) {
  try {
    const { statusCode, body } = await fetchUpstream(upstreamPath);
    console.log(`${logPrefix} 上游 HTTP ${statusCode} ${body.substring(0, 150)}`);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  } catch (e) {
    console.error(`${logPrefix} 错误: ${e.message}`);
    const code = e.message === '请求超时' ? 504 : 502;
    sendJson(res, code, { code, msg: e.message === '请求超时' ? '请求超时' : 'API 请求失败: ' + e.message });
  }
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (parsed.pathname === '/api/mbti/question') {
    const q = parsed.query;
    const num = parseInt(q.num, 10) || 1;
    const version = parseInt(q.version, 10) || 3;
    const upstreamPath =
      `/api/mingli/mbti.php?id=${encodeURIComponent(API_ID)}&key=${encodeURIComponent(API_KEY)}&type=1&version=${version}&num=${num}`;
    console.log(`[问题] v${version} #${num}`);
    proxyMbti(upstreamPath, res, '[问题]');
    return;
  }

  if (parsed.pathname === '/api/mbti/submit') {
    const q = parsed.query;
    const version = parseInt(q.version, 10) || 3;
    const qcan = q.qcan != null ? String(q.qcan) : '';
    const upstreamPath =
      `/api/mingli/mbti.php?id=${encodeURIComponent(API_ID)}&key=${encodeURIComponent(API_KEY)}&type=2&version=${version}&qcan=${encodeURIComponent(qcan)}`;
    console.log(`[提交] v${version} 答案数=${qcan.split(',').length}`);
    proxyMbti(upstreamPath, res, '[提交]');
    return;
  }

  let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  filePath = path.join(__dirname, filePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`MBTI 测试服务已启动: http://localhost:${PORT}`);
});
