const { parse } = require('url');
const { fetchUpstream } = require('../_lib/mbtiUpstream');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ code: 405, msg: 'Method Not Allowed' }));
  }

  const API_ID = process.env.API_ID;
  const API_KEY = process.env.API_KEY;
  if (!API_ID || !API_KEY) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ code: 500, msg: '未配置 API_ID / API_KEY，请在 Vercel 环境变量中设置' }));
  }

  const q = parse(req.url || '', true).query || {};
  const version = parseInt(String(q.version), 10) || 3;
  const qcan = q.qcan != null ? String(q.qcan) : '';

  const path =
    `/api/mingli/mbti.php?id=${encodeURIComponent(API_ID)}&key=${encodeURIComponent(API_KEY)}&type=2&version=${version}&qcan=${encodeURIComponent(qcan)}`;

  try {
    const { statusCode, body } = await fetchUpstream(path);
    res.statusCode = statusCode >= 200 && statusCode < 600 ? statusCode : 502;
    return res.end(body);
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ code: 502, msg: '上游请求失败: ' + (e.message || String(e)) }));
  }
};
