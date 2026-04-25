'use strict';
/**
 * 把当前仓库构建为可直接静态托管的目录 dist_static/。
 *   - 复制 public/* 到 dist_static/
 *   - 复制 mock_data/ 到 dist_static/mock_data/
 *   - 生成 dist_static/_redirects 和 dist_static/404.html，兼容 SPA 深链
 *
 * 使用：
 *   bun run scripts/build_search_index.js   # 先生成搜索索引
 *   bun run scripts/build_static_site.js
 *   # 把 dist_static/ 推到 GitHub Pages / Cloudflare Pages / Netlify 即可
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist_static');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

console.log('[build] cleaning', path.relative(ROOT, OUT));
rmrf(OUT);
fs.mkdirSync(OUT, { recursive: true });

console.log('[build] copying public/');
copyDir(path.join(ROOT, 'public'), OUT);

console.log('[build] copying mock_data/');
copyDir(path.join(ROOT, 'mock_data'), path.join(OUT, 'mock_data'));

// Cloudflare Pages / Netlify 风格 SPA fallback
const redirects = [
  '/api/*  /index.html  404',           // 不应触发；有 SW 接管
  '/app/*  /app/dashboard.html  200',   // SPA 深链
  '/login/* /login/signin.html  200',
  '/*      /app/dashboard.html  200',   // 兜底
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, '_redirects'), redirects);

// GitHub Pages: 复制 dashboard.html 为 404.html，让任意未知路径都进 SPA
fs.copyFileSync(
  path.join(OUT, 'app', 'dashboard.html'),
  path.join(OUT, '404.html')
);

console.log('[ok] static site built at', path.relative(ROOT, OUT));
console.log('     deploy: 把整个 dist_static/ 推到静态托管即可。');
