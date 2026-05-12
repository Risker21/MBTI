/**
 * Vercel 构建：把根目录 index.html 复制到 dist，
 * 避免控制台里「输出目录」指向空目录或忽略根目录静态文件时出现根路径 404。
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const src = path.join(root, 'index.html');
const dest = path.join(dist, 'index.html');

if (!fs.existsSync(src)) {
  console.error('缺少 index.html:', src);
  process.exit(1);
}
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(src, dest);
console.log('vercel-build: 已复制 index.html -> dist/index.html');
