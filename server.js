const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

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

function proxyRequest(target, res) {
  const apiReq = https.get(target, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
    }
  }, (apiRes) => {
    let body = '';
    apiRes.on('data', d => body += d);
    apiRes.on('end', () => {
      console.log(`[API] ${apiRes.statusCode} ${body.substring(0, 150)}`);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
    });
  });

  apiReq.on('error', (e) => {
    console.error(`[API] 错误: ${e.message}`);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 502, msg: 'API 请求失败: ' + e.message }));
  });

  apiReq.setTimeout(15000, () => {
    apiReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 504, msg: '请求超时' }));
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // ---- API 代理：前端不传 key/id，由服务端注入 ----
  if (parsed.pathname === '/api/mbti/question') {
    const q = parsed.query;
    const num = parseInt(q.num) || 1;
    const version = parseInt(q.version) || 3;
    const target = `https://cn.apihz.cn/api/mingli/mbti.php?id=${API_ID}&key=${API_KEY}&type=1&version=${version}&num=${num}`;
    console.log(`[问题] v${version} #${num}`);
    proxyRequest(target, res);
    return;
  }

  if (parsed.pathname === '/api/mbti/submit') {
    const q = parsed.query;
    const version = parseInt(q.version) || 3;
    const qcan = q.qcan || '';
    const target = `https://cn.apihz.cn/api/mingli/mbti.php?id=${API_ID}&key=${API_KEY}&type=2&version=${version}&qcan=${encodeURIComponent(qcan)}`;
    console.log(`[提交] v${version} 答案数=${qcan.split(',').length}`);
    proxyRequest(target, res);
    return;
  }

  // ---- 静态文件 ----
  let filePath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  filePath = path.join(__dirname, filePath);

  // 防止路径穿越
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
