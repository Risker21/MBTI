const https = require('https');

const UPSTREAM = 'cn.apihz.cn';

/**
 * GET 上游 MBTI 接口，返回原始响应体（JSON 字符串）
 */
function fetchUpstream(pathAndQuery) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: UPSTREAM,
        path: pathAndQuery,
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; MBTI-Test/1.0)',
        },
        timeout: 15000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 500, body });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = { fetchUpstream };
