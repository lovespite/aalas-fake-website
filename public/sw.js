/* eslint-disable no-restricted-globals */
/**
 * AALAS 静态化 Service Worker
 *
 * 替代原 server.js：
 *   - GET  /api/Foo/123          → /mock_data/api/Foo/123.json
 *   - POST /api/Foo/123          → /mock_data/api/Foo/123.POST.json （回退到合成响应）
 *   - GET  /api/Foo?bar=1        → /mock_data/api/Foo__q_<md5(?bar=1)[:8]>.json
 *   - POST /token                → 合成 mock token
 *   - GET  /api/SearchTitle/:q   → 加载 /mock_data/_index/courses.json 客户端 filter
 *   - 写入类 POST/PUT/DELETE      → 合成 200 响应（authoring 离线无法持久化）
 *
 * 注意：必须从站点根 (/sw.js) 提供，scope 默认 '/' 才能拦截全部路径。
 */
'use strict';

const SW_VERSION = 'aalas-sw-v3';
const MOCK_BASE = '/mock_data';
const SEARCH_INDEX_URL = MOCK_BASE + '/_index/courses.json';

const MOCK_TOKEN_VALUE = 'mock-token-aalas-offline';

// ---------- 媒体 CDN 重定向 ----------
// 把同源的图片/音视频请求 302 到 CDN，路径保持不变。
// 设为空字符串可关闭。
const MEDIA_CDN = 'https://static.aalas.net';
// 命中以下扩展名的请求会被重定向到 CDN
const MEDIA_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg|ico|avif|mp3|wav|ogg|m4a|flac|aac|mp4|m4v|webm|mov|ogv)(\?|$)/i;
// 这些前缀的路径不走 CDN（mock 数据、SW 自身、SPA 入口等）
const MEDIA_EXEMPT_PREFIXES = ['/mock_data/', '/api/', '/sw.js', '/bower_components/', '/assets/'];

// ---------- 安装/激活：尽快接管 ----------
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------- 工具：md5 短哈希 (与 server.js 一致：md5(search).slice(0,8)) ----------
// SW 没有 Node crypto；引入一个轻量 md5 实现
function md5(str) {
  // 经典 MD5 实现（紧凑版，2KB），输出 32 位 hex
  function rh(n) { let s = '', j; for (j = 0; j <= 3; j++) s += ((n >> (j * 8 + 4)) & 0x0F).toString(16) + ((n >> (j * 8)) & 0x0F).toString(16); return s; }
  function ad(x, y) { const l = (x & 0xFFFF) + (y & 0xFFFF); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF); }
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
  function sb(s) {
    const nb = ((s.length + 8) >> 6) + 1, b = new Array(nb * 16).fill(0);
    for (let i = 0; i < s.length; i++) b[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    b[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
    b[nb * 16 - 2] = s.length * 8;
    return b;
  }
  const x = sb(unescape(encodeURIComponent(str)));
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}

function shortHash(s) { return md5(s).slice(0, 8); }

// ---------- 候选路径生成（与 server.js buildCandidatePaths 一致） ----------
function buildCandidatePaths(reqPath, method, search) {
  let segments = reqPath.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segments.length === 0) return [];
  segments = segments.map((s) => s.replace(/\.\.+/g, '_').replace(/[^A-Za-z0-9._\-]/g, '_'));
  const last = segments.pop();
  const dir = MOCK_BASE + '/' + segments.join('/');

  const variants = [];
  if (search) variants.push(`${last}__q_${shortHash(search)}`);
  variants.push(last);

  const out = [];
  for (const v of variants) {
    const wm = method && method !== 'GET' ? `${v}.${method.toUpperCase()}` : null;
    if (wm) {
      out.push(`${dir}/${wm}.json`);
      out.push(`${dir}/${wm}`);
    }
    out.push(`${dir}/${v}.json`);
    out.push(`${dir}/${v}`);
  }
  return out;
}

async function tryFetchFirst(urls) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'force-cache' });
      if (r.ok) return r;
    } catch (_) { /* next */ }
  }
  return null;
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Mock-By': 'sw', ...extraHeaders },
  });
}

// ---------- 合成响应 ----------
function makeTokenResponse(username) {
  const now = new Date();
  const exp = new Date(now.getTime() + 86400 * 1000);
  return {
    access_token: MOCK_TOKEN_VALUE,
    token_type: 'bearer',
    expires_in: 86400,
    userName: username || 'demo',
    '.issued': now.toUTCString(),
    '.expires': exp.toUTCString(),
  };
}

async function parseFormOrJson(request) {
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('application/json')) return await request.clone().json();
    if (ct.includes('application/x-www-form-urlencoded')) {
      const text = await request.clone().text();
      const out = {};
      new URLSearchParams(text).forEach((v, k) => { out[k] = v; });
      return out;
    }
  } catch (_) { /* ignore */ }
  return {};
}

// 课程搜索：客户端 filter
let _searchIndex = null;
async function getSearchIndex() {
  if (_searchIndex) return _searchIndex;
  try {
    const r = await fetch(SEARCH_INDEX_URL, { cache: 'force-cache' });
    if (r.ok) _searchIndex = await r.json();
    else _searchIndex = [];
  } catch (_) { _searchIndex = []; }
  return _searchIndex;
}

// ---------- 主拦截 ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 仅拦截同源
  if (url.origin !== self.location.origin) return;

  // 媒体资源 → CDN（仅 GET / HEAD）
  if (MEDIA_CDN && (req.method === 'GET' || req.method === 'HEAD')
    && MEDIA_EXT_RE.test(url.pathname)
    && !MEDIA_EXEMPT_PREFIXES.some((p) => url.pathname.startsWith(p))) {

    const fileName = url.pathname.split('/').pop();
    const encodedFileName = encodeURIComponent(fileName);
    const cdnUrl = MEDIA_CDN + url.pathname.replace(fileName, encodedFileName) + url.search;
    event.respondWith(Response.redirect(cdnUrl, 302));
    return;
  }

  // POST /token —— 登录
  if (req.method === 'POST' && url.pathname === '/token') {
    event.respondWith((async () => {
      const body = await parseFormOrJson(req);
      const u = body.username || body.userName || 'demo';
      return jsonResponse(makeTokenResponse(u));
    })());
    return;
  }

  // 仅处理 /api/* 之外保持原样
  if (!url.pathname.startsWith('/api/')) return;

  event.respondWith(handleApi(req, url));
});

async function handleApi(req, url) {
  const path = url.pathname;
  const method = req.method.toUpperCase();
  const search = url.search || '';

  // ------- 显式合成的端点 -------
  if (method === 'GET' && path === '/api/ClientToken') {
    return jsonResponse({ token: MOCK_TOKEN_VALUE });
  }

  if (method === 'GET' && path.startsWith('/api/SearchTitle/')) {
    const q = decodeURIComponent(path.substring('/api/SearchTitle/'.length)).toLowerCase();
    const idx = await getSearchIndex();
    return jsonResponse(idx.filter((c) => c.title && c.title.toLowerCase().includes(q)));
  }

  // POST /api/Page/:id —— 原 mock 直接返回 {hasExam:true,status:'active'}
  if (method === 'POST' && /^\/api\/Page\/\d+$/.test(path)) {
    return jsonResponse({ hasExam: true, status: 'active' });
  }

  // POST /api/Exam/SaveAnswer/:e/:q/:a → 200 (空)
  if (method === 'POST' && /^\/api\/Exam\/SaveAnswer\/.+/.test(path)) {
    return new Response(null, { status: 200, headers: { 'X-Mock-By': 'sw' } });
  }
  if (method === 'POST' && /^\/api\/Exam\/SaveMultipleAnswer\/.+/.test(path)) {
    return new Response(null, { status: 200, headers: { 'X-Mock-By': 'sw' } });
  }

  // POST /api/Exam/ScoreExam → 回 echo body.id
  if (method === 'POST' && path === '/api/Exam/ScoreExam') {
    const body = await parseFormOrJson(req);
    return jsonResponse(body && body.id ? body.id : 0);
  }

  // ------- 尝试静态 mock 文件 -------
  const candidates = buildCandidatePaths(path, method, search);
  const hit = await tryFetchFirst(candidates);
  if (hit) {
    return new Response(hit.body, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Mock-By': 'sw-file' },
    });
  }

  // ------- 兜底：写操作返回 200，读操作返回空数组 -------
  if (method !== 'GET') {
    return jsonResponse({ ok: true, mock: true, note: 'authoring is read-only in static build' });
  }

  // GET 无 mock：列表类返回 []，单体返回 {}
  return jsonResponse([], 200, { 'X-Mock-By': 'sw-empty' });
}
