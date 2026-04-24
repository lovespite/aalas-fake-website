/**
 * 阶段三：本地 Mock 服务器
 *
 * 功能：
 *   1. 静态托管 ./public （AngularJS SPA 前端资源）
 *   2. 拦截 /api/* 请求，从 ./mock_data 中读取对应 JSON 返回
 *   3. POST /token 一律返回成功 → 任意账号密码均可登录
 *   4. 在所有 HTML 响应中注入鉴权脚本，自动写入 sessionStorage 中的
 *      ngStorage-authorizationData，无需手动登录就能进入 dashboard
 *   5. 兼容原站 html5Mode 的无 .html 后缀路由：
 *        /app/dashboard         → public/app/dashboard.html
 *        /app/library/course/3 → public/app/dashboard.html （SPA 兜底）
 *
 * 启动：
 *   node server.js               # 默认 3000 端口
 *   PORT=8080 node server.js
 *   入口：http://localhost:3000  →  自动 302 到 /app/dashboard.html
 */

'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MOCK_DIR = path.join(__dirname, 'mock_data');

const app = express();
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true, limit: '4mb' }));
app.use(express.json({ limit: '4mb' }));

// 简易访问日志
app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- 1. 鉴权伪装：任何账号密码都能登录 ----------
const MOCK_TOKEN_VALUE = 'mock-token-aalas-offline';
function makeTokenResponse(username = 'demo') {
  const now = new Date();
  const exp = new Date(now.getTime() + 86400 * 1000);
  return {
    access_token: MOCK_TOKEN_VALUE,
    token_type: 'bearer',
    expires_in: 86400,
    userName: username,
    '.issued': now.toUTCString(),
    '.expires': exp.toUTCString(),
  };
}

const courseMemoryIndex = [];

function buildMemoryCourseIndex() {
  fs.readdirSync(path.join(MOCK_DIR, 'api', 'Course')).forEach((file) => {
    if (file.endsWith('.meta.json')) return; // 跳过 meta 文件
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(MOCK_DIR, 'api', 'Course', file), 'utf8');
        const json = JSON.parse(content);
        if (json && json.id) {
          courseMemoryIndex.push({
            id: json.id,
            title: (json.title + "").toLowerCase()
          });
        }
      } catch (_) { /* skip */ }
    }
  });

  console.log(`已构建课程内存索引，共 ${courseMemoryIndex.length} 条记录`);
}

buildMemoryCourseIndex();
app.get('/api/SearchTitle/:query', (req, res) => {
  const { query } = req.params;
  const q = query.toLowerCase();
  const results = courseMemoryIndex.filter((c) => c.title && c.title.includes(q));
  res.json(results);
});

// AngularJS authService 走 POST /token （含 grant_type=password 和 refresh_token 两种）
app.post('/token', (req, res) => {
  const u = (req.body && (req.body.username || req.body.userName)) || 'demo';
  console.log(`        ↳ 发放 mock token 给 "${u}"`);
  res.json(makeTokenResponse(u));
});

// 一些 client_token 接口在 loginCtrl 里被调用过，统一给个空对象
app.get('/api/ClientToken', (_req, res) => res.json({ token: MOCK_TOKEN_VALUE }));

// ---------- 2. /api/* → mock_data 查找 ----------
function shortHash(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
}

/**
 * 解析请求，返回可能的本地文件路径候选列表（按优先级）。
 * 与 fetch_api_data.js 中 urlToLocalPath 的命名规则保持一致：
 *   GET  /api/Course/123              → mock_data/api/Course/123.json
 *   POST /api/Page/456                → mock_data/api/Page/456.POST.json
 *   /api/Foo?bar=1                    → mock_data/api/Foo__q_<hash>.json
 */
function buildCandidatePaths(reqPath, method, search) {
  // reqPath 已经形如 /api/...，剥掉前导 /
  let segments = reqPath.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segments.length === 0) return [];
  segments = segments.map((s) => s.replace(/\.\.+/g, '_').replace(/[^A-Za-z0-9._\-]/g, '_'));
  let last = segments.pop();
  const dir = path.join(MOCK_DIR, ...segments);

  const variants = [];
  if (search) variants.push(`${last}__q_${shortHash(search)}`);
  variants.push(last); // 不带 query 的兜底

  const out = [];
  for (const v of variants) {
    const withMethod = method && method !== 'GET' ? `${v}.${method.toUpperCase()}` : null;
    if (withMethod) {
      out.push(path.join(dir, `${withMethod}.json`));
      out.push(path.join(dir, withMethod));
    }
    out.push(path.join(dir, `${v}.json`));
    out.push(path.join(dir, v));
  }
  return out;
}

// Exam api
// /api/Exam/SaveAnswer/[:examId]/[questionId]/[:answerId]
//
app.post('/api/Exam/SaveAnswer/:examId/:questionId/:answerId', (req, res) => {
  const { examId, questionId, answerId } = req.params;
  console.log(`        ↳ 模拟保存考试答案：examId=${examId}, questionId=${questionId}, answerId=${answerId}`);
  res.status(200).json();
});

app.post('/api/Exam/ScoreExam', (req, res) => {
  const { id } = req.body || {};
  console.log(`        ↳ 模拟评分考试：examId=${id}`);
  res.status(200).json(id);
});

// app.get('/api/Exam/:examId', (req, res) => {


// });


// Get Page meta
app.post('/api/Page/:id', (req, res) => {
  res.status(200).json({
    hasExam: true,
    status: "active"
  });
});

app.use('/api', (req, res, next) => {
  const fullPath = '/api' + req.path; // req.path 是被 mount 截掉前缀后的剩余路径

  const search = req.originalUrl.includes('?')
    ? '?' + req.originalUrl.split('?')[1]
    : '';

  const candidates = buildCandidatePaths(fullPath, req.method, search);
  for (const file of candidates) {
    try {
      const st = fs.statSync(file);
      if (st.isFile()) {
        res.set('X-Mock-File', path.relative(__dirname, file));
        return res.type('application/json').sendFile(file);
      }
    } catch (_) {
      /* not found, try next */
    }
  }

  if (/\/api\/Page\/\d+$/.test(fullPath) && req.method === 'POST') {
    console.log(`        ↳ 模拟 Page API：${fullPath} → 200 with hasExam=true`);
    return res.json({ hasExam: true, status: "active" });
  }

  console.warn(`        ↳ ⚠ 无 mock：${req.method} ${fullPath}`);
  res.status(404).json({
    error: 'No mock data',
    method: req.method,
    path: fullPath,
    triedRelative: candidates.map((c) => path.relative(MOCK_DIR, c)),
  });
});

// ---------- 3. HTML 注入：自动写入登录态 ----------
const AUTH_INJECT_SCRIPT = `
<script>
(function () {
  try {
    var KEY = 'ngStorage-authorizationData';
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, JSON.stringify({
        token: '${MOCK_TOKEN_VALUE}',
        userName: 'demo',
        isAuth: true,
        useRefreshTokens: false
      }));
    }
  } catch (e) { /* ignore */ }
})();
</script>
`;

async function sendHtmlWithAuthInject(res, filePath) {
  try {
    let html = await fsp.readFile(filePath, 'utf8');
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, AUTH_INJECT_SCRIPT + '</head>');
    } else {
      html = AUTH_INJECT_SCRIPT + html;
    }
    res.set('X-Mock-File', path.relative(__dirname, filePath));
    res.type('html').send(html);
  } catch (e) {
    res.status(500).send(`Read failed: ${e.message}`);
  }
}

// ---------- 4. 路由：/、/app/*、/login/*，兼容无 .html 后缀 ----------
// 入口：直接进 dashboard
app.get('/', (_req, res) => res.redirect('/app/dashboard.html'));

// 这些路径下属真实的静态资源（缺失就 404，绝不能回退到 dashboard.html，
// 否则 ui-router/ocLazyLoad 拿到的 "模板" 里夹带的 <script> 会重复加载 angular）。
const STATIC_PREFIXES = [
  '/assets/',
  '/bower_components/',
  '/Images/',
  '/images/',
  '/fonts/',
  '/css/',
  '/js/',
];

function isStaticAssetPath(p) {
  if (STATIC_PREFIXES.some((pre) => p.startsWith(pre))) return true;
  // 任何带非 .html 扩展名的请求都视为静态资源
  const ext = path.extname(p).toLowerCase();
  if (ext && ext !== '.html' && ext !== '.htm') return true;
  return false;
}

/**
 * SPA 路由文件解析：
 *   1. 原样存在
 *   2. 无扩展名时加 .html 试一次
 *   3. 仅当不是静态资源目录时，兜底到 dashboard.html
 */
function resolveSpaFile(reqPath) {
  const direct = path.join(PUBLIC_DIR, reqPath);
  try { if (fs.statSync(direct).isFile()) return direct; } catch (_) { }

  if (!path.extname(reqPath)) {
    const html = path.join(PUBLIC_DIR, reqPath + '.html');
    try { if (fs.statSync(html).isFile()) return html; } catch (_) { }
  }

  if (isStaticAssetPath(reqPath)) return null; // 不兜底

  const dashboard = path.join(PUBLIC_DIR, 'app/dashboard.html');
  try { if (fs.statSync(dashboard).isFile()) return dashboard; } catch (_) { }
  return null;
}

app.get(/^\/app(\/.*)?$/, async (req, res, next) => {
  const file = resolveSpaFile(req.path);
  if (!file) return next();
  if (file.toLowerCase().endsWith('.html')) {
    return sendHtmlWithAuthInject(res, file);
  }
  return res.sendFile(file);
});

app.get(/^\/login(\/.*)?$/, async (req, res, next) => {
  const tries = [
    path.join(PUBLIC_DIR, req.path),
    !path.extname(req.path) ? path.join(PUBLIC_DIR, req.path + '.html') : null,
    path.join(PUBLIC_DIR, 'login/signin.html'),
  ].filter(Boolean);
  for (const f of tries) {
    try {
      if (fs.statSync(f).isFile()) {
        if (f.toLowerCase().endsWith('.html')) return sendHtmlWithAuthInject(res, f);
        return res.sendFile(f);
      }
    } catch (_) {
      /* skip */
    }
  }
  next();
});

// ---------- 5. 静态资源（CSS/JS/Images/fonts/bower_components 等） ----------
// extensions: ['html'] 让 /foo 能命中 /foo.html
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: 0 }));

// ---------- 6. 兜底：未知 GET 仅在非静态资源路径下回 dashboard.html ----------
app.use((req, res) => {
  if (req.method === 'GET' && !isStaticAssetPath(req.path)) {
    const dashboard = path.join(PUBLIC_DIR, 'app/dashboard.html');
    if (fs.existsSync(dashboard)) return sendHtmlWithAuthInject(res, dashboard);
  }
  res.status(404).send('Not Found');
});


app.listen(PORT, () => {
  console.log('=========================================================');
  console.log(`Mock 服务已启动: http://localhost:${PORT}`);
  console.log(`  public:    ${PUBLIC_DIR}`);
  console.log(`  mock_data: ${MOCK_DIR}`);
  console.log('  入口：http://localhost:' + PORT + '/  → /app/dashboard.html');
  console.log('  登录页任意账号密码均可通过；HTML 中已自动注入登录态');
  console.log('=========================================================');
});
