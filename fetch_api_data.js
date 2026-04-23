/**
 * 阶段二：动态 API 数据拦截与存档
 *
 * 工作流程：
 *   1. 使用 Playwright 持久化上下文（首次运行时手动登录，登录态保存在 ./.playwright-data，下次免登录）
 *   2. 监听所有 XHR/Fetch 响应，将目标域名下 JSON 类响应按 URL 路径保存到 ./mock_data/
 *   3. （可选）开启自动遍历模式：解析已抓取的 /api/Catalog 数据，
 *      自动访问每个 library / track / free / race / customCourse 下的
 *      course → lesson → page，让前端自然触发对应 API 调用，从而完成全量抓取
 *
 * 使用：
 *   node fetch_api_data.js              # 仅手动模式（弹窗后人工登录并浏览，Ctrl+C 结束）
 *   node fetch_api_data.js --auto       # 手动登录后再自动遍历目录
 *   node fetch_api_data.js --auto --headless
 *   node fetch_api_data.js --no-proxy   # 不走本地代理
 *   node fetch_api_data.js --force      # 已存在的 JSON 也重新抓取
 *
 * 命名约定（URL → 文件）：
 *   GET  /api/Course/123          → mock_data/api/Course/123.json
 *   POST /api/Page/456            → mock_data/api/Page/456.POST.json
 *   /api/Foo?bar=1                → mock_data/api/Foo__q_<hash>.json
 *   末段不含 . 时自动追加 .json；含 . 时按原扩展名保存
 *   每个文件附带一个 `<file>.meta.json` 记录原始 URL / method / status，方便后续 Mock 服务器查找
 */

'use strict';

const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const TARGET_DOMAIN = 'aalaslearninglibrary.org';
const SAVE_DIR = path.join(__dirname, 'mock_data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const USER_DATA_DIR = path.join(__dirname, '.playwright-data');

// 顺带抓取的静态资源类型（与 go-fetch.js 对齐，但聚焦在浏览过程中按需加载的图片 / 视频 / 字体）
const STATIC_RESOURCE_TYPES = new Set(['image', 'media', 'font']);
let staticSavedCount = 0;
const ENTRY_URL = `https://${TARGET_DOMAIN}/login/signin`; //aalaslearninglibrary.org/login/signin

const args = new Set(process.argv.slice(2));
const AUTO = args.has('--auto');
const HEADLESS = args.has('--headless');
const FORCE = args.has('--force');
const NO_PROXY = args.has('--no-proxy');

// 已写入磁盘的 URL 集合，用于自动遍历阶段去重 / 等待
const savedUrls = new Set();
let savedCount = 0;

function shortHash(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
}

/**
 * URL → 本地保存路径
 *   - GET 默认；其它 method 在末段追加 `.<METHOD>`
 *   - 含 query 时追加 `__q_<md5前8位>`
 *   - 末段不含 `.` 自动追加 `.json`
 */
function urlToLocalPath(urlObj, method) {
  let segments = urlObj.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segments.length === 0) segments = ['_root'];

  // 对每段做安全化（避免 .. 与非法字符）
  segments = segments.map((seg) =>
    seg.replace(/\.\.+/g, '_').replace(/[^A-Za-z0-9._\-]/g, '_')
  );

  let last = segments.pop();

  if (urlObj.search) {
    last += `__q_${shortHash(urlObj.search)}`;
  }
  if (method && method !== 'GET') {
    last += `.${method.toUpperCase()}`;
  }
  if (!/\.[A-Za-z0-9]+$/.test(last)) {
    last += '.json';
  }

  return path.join(SAVE_DIR, ...segments, last);
}

function isApiResponse(response) {
  const req = response.request();
  const url = new URL(req.url());
  if (url.hostname !== TARGET_DOMAIN) return false;

  const rt = req.resourceType();
  if (rt !== 'xhr' && rt !== 'fetch') return false;

  // 仅采集成功响应
  const status = response.status();
  if (status < 200 || status >= 300) return false;

  return true;
}

/**
 * 拦截浏览过程中按需加载的图片 / 视频 / 字体，落到 public/ 镜像 URL 路径。
 * 与 go-fetch.js 行为一致：仅同域、2xx，文件已存在则跳过（除非 --force）。
 */
async function handleStaticResource(response) {
  try {
    const req = response.request();
    const rt = req.resourceType();
    if (!STATIC_RESOURCE_TYPES.has(rt)) return;

    const url = new URL(req.url());
    if (url.hostname !== TARGET_DOMAIN) return;

    const status = response.status();
    if (status < 200 || status >= 300) return;

    const relative = url.pathname.replace(/^\/+/, '');
    if (!relative) return;
    const filePath = path.join(PUBLIC_DIR, relative);

    if (!FORCE && (await fs.pathExists(filePath))) return;

    const body = await response.body();
    await fs.outputFile(filePath, body);
    staticSavedCount++;
    console.log(`[资源 #${staticSavedCount}] (${rt}) ${url.pathname}  →  public/${relative}`);
  } catch (e) {
    if (!String(e.message).includes('Response body is unavailable')) {
      console.error(`[资源失败] ${response.url()}: ${e.message}`);
    }
  }
}

async function handleResponse(response) {
  // 静态资源与 API 互斥（资源类型不同），各自独立处理
  await handleStaticResource(response);

  try {
    if (!isApiResponse(response)) return;

    const req = response.request();
    const url = new URL(req.url());
    const method = req.method();
    const filePath = urlToLocalPath(url, method);

    if (!FORCE && (await fs.pathExists(filePath))) {
      savedUrls.add(req.url());
      return;
    }

    const headers = response.headers();
    const ctype = (headers['content-type'] || '').toLowerCase();
    const body = await response.body();

    // 仅保存 JSON / 文本类响应；图片等已由 go-fetch.js 处理
    if (
      ctype.includes('application/json') ||
      ctype.includes('text/json') ||
      ctype.includes('text/plain') ||
      ctype.includes('application/javascript') // 偶有 JSON 被错误标记为 js
    ) {
      await fs.outputFile(filePath, body);
      const meta = {
        url: req.url(),
        method,
        status: response.status(),
        contentType: headers['content-type'] || null,
        savedAt: new Date().toISOString(),
      };
      await fs.outputFile(`${filePath}.meta.json`, JSON.stringify(meta, null, 2));
      savedUrls.add(req.url());
      savedCount++;
      const rel = path.relative(__dirname, filePath);
      console.log(`[保存 #${savedCount}] ${method} ${url.pathname}${url.search}  →  ${rel}`);
    }
  } catch (e) {
    // 重定向 / 已关闭的响应等情况会抛错，忽略
    if (!String(e.message).includes('Response body is unavailable')) {
      console.error(`[拦截失败] ${response.url()}: ${e.message}`);
    }
  }
}

/**
 * 等待网络空闲（吞掉超时，不让单个慢请求阻断遍历）
 */
async function waitNetIdle(page, timeout = 20000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (_) {
    /* ignore */
  }
}

/**
 * 关闭 SweetAlert 弹窗（订阅到期等提示）。
 * 每次页面加载后可能出现 div.sweet-alert.showSweetAlert.visible，
 * 必须点击其内部 button.cancel 才能继续；没出现时静默返回。
 */
async function dismissOverlay(page, { timeout = 5000 } = {}) {
  try {
    const overlay = page.locator('div.sweet-alert.showSweetAlert.visible').first();
    await overlay.waitFor({ state: 'visible', timeout });
    const cancelBtn = overlay.locator('button.cancel');
    if ((await cancelBtn.count()) > 0) {
      await cancelBtn.first().click({ timeout: 5000 });
    } else {
      // 兜底：只有 confirm 时也按掉，避免遮挡
      const confirmBtn = overlay.locator('button.confirm');
      if ((await confirmBtn.count()) > 0) {
        await confirmBtn.first().click({ timeout: 5000 });
      }
    }
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
  } catch {
    // 没弹出就跳过
  }
}

/**
 * page.goto 的统一封装：
 *   - 默认 domcontentloaded + 60s 超时
 *   - 跳转后立即尝试关闭 SweetAlert 弹窗
 *   - 吞掉 goto 异常（个别课程页可能挂掉，不应中断整个遍历）
 */
async function safeGoto(page, url, opts = {}) {
  await page
    .goto(url, { waitUntil: 'domcontentloaded', timeout: 60000, ...opts })
    .catch(() => { });
  await dismissOverlay(page);
}

/**
 * 强制展开导航中所有折叠的 sub-menu，以便后续直接定位/点击叶子节点。
 */
async function expandAllNavSubmenus(page) {
  await page.evaluate(() => {
    document.querySelectorAll('ul.navigator ul.sub-menu').forEach((el) => {
      el.style.display = 'block';
    });
    document.querySelectorAll('ul.navigator li').forEach((li) => li.classList.add('open'));
  });
}

/**
 * 进入 dashboard 并等待左侧导航就绪。
 * 返回 false 表示导航未渲染（多半是未登录），调用方应放弃自动遍历。
 */
async function gotoDashboard(page) {
  console.log('\n[自动遍历] 回到 dashboard 等待导航渲染...');
  await safeGoto(page, `https://${TARGET_DOMAIN}/app/dashboard`);
  try {
    await page.waitForSelector('ul.navigator ul.sub-menu', { timeout: 30000 });
  } catch {
    return false;
  }
  await waitNetIdle(page);
  return true;
}

/**
 * 从导航中收集所有课程入口 → [{ courseId, title }]
 * 仅依赖 href 的 /course/<id> 段，不区分相对/绝对路径。
 */
async function collectCourseIdsFromNav(page) {
  await expandAllNavSubmenus(page);
  return page.$$eval(
    'ul.navigator ul.sub-menu a[href*="/course/"]',
    (anchors) => {
      const seen = new Set();
      const out = [];
      for (const a of anchors) {
        const raw = a.getAttribute('href') || a.href || '';
        const m = raw.match(/\/course\/(\d+)(?:[/?#]|$)/);
        if (!m) continue;
        const id = m[1];
        if (seen.has(id)) continue;
        seen.add(id);
        const title = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
        out.push({ courseId: id, title });
      }
      return out;
    }
  );
}

/**
 * 从浏览器存储中读取 Bearer token。
 * Angular 用 ngStorage，session/local 都可能落键 ngStorage-authorizationData。
 */
async function getAuthToken(page) {
  return page.evaluate(() => {
    const KEY = 'ngStorage-authorizationData';
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const o = JSON.parse(raw);
      return (o && o.token) || null;
    } catch {
      return null;
    }
  });
}

/**
 * 在页面上下文中发起 fetch 请求。
 *   - 同源调用，cookie 自动带上
 *   - 手动附加 Authorization: Bearer <token>（与 authInterceptorService 等价）
 *   - 由于走的是浏览器网络栈，context.on('response') 仍会触发 → handleResponse 会落盘
 *   - 同时把 JSON 直接返回给我们用于驱动后续遍历
 */
async function fetchJsonInPage(page, url, token) {
  return page.evaluate(
    async ({ url, token }) => {
      const headers = { Accept: 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      try {
        const r = await fetch(url, { method: 'GET', headers, credentials: 'include' });
        const text = await r.text();
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch { }
        return { status: r.status, json };
      } catch (e) {
        return { status: 0, error: String(e && e.message ? e.message : e) };
      }
    },
    { url, token }
  );
}

/**
 * 命中本地缓存就直接读盘，否则走网络抓取（顺带由 handleResponse 落盘）。
 * 返回 { status, json, cached }。--force 时绕过缓存。
 */
async function getOrFetchJson(page, urlPath, token, method = 'GET') {
  const u = new URL(urlPath);
  const localPath = urlToLocalPath(u, method);
  if (!FORCE && (await fs.pathExists(localPath))) {
    try {
      const json = await fs.readJson(localPath);
      return { status: 200, json, cached: true };
    } catch {
      /* 损坏的缓存 → 重新抓 */
    }
  }
  const res = await fetchJsonInPage(page, urlPath, token);
  return { ...res, cached: false };
}

/**
 * 处理单门课程：拉取 Course 元数据 → 逐个 lesson 拉 Pages → 有 exam 则生成 Exam。
 */
async function processCourse(page, link, index, total, token) {
  const base = `https://${TARGET_DOMAIN}`;
  const tag = `[${index + 1}/${total}] 课程 #${link.courseId}`;
  console.log(`\n${tag} ${link.title || ''}`);

  const courseRes = await getOrFetchJson(page, `${base}/api/Course/${link.courseId}`, token);
  if (courseRes.status !== 200 || !courseRes.json) {
    console.log(`  课程元数据失败 (status=${courseRes.status}${courseRes.error ? ', ' + courseRes.error : ''})`);
    return;
  }
  const course = courseRes.json;
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  console.log(
    `  ${courseRes.cached ? '(cached) ' : ''}${lessons.length} 个章节${course.hasExam ? ' + 测验' : ''}`
  );

  for (const lesson of lessons) {
    if (!lesson || lesson.id == null) continue;
    process.stdout.write(`    → lesson ${lesson.id} ${lesson.title || ''} ... `);
    const r = await getOrFetchJson(page, `${base}/api/Pages/${lesson.id}`, token);
    process.stdout.write(
      r.status === 200 ? (r.cached ? 'CACHED\n' : 'OK\n') : `FAIL(${r.status})\n`
    );

    if (r.json.lesson && r.json.lesson.hasPracticeQuestions) {
      process.stdout.write(`      → practice Lesson/PracticeQuestions ... `);
      const pr = await getOrFetchJson(page, `${base}/api/Lesson/PracticeQuestions/${lesson.id}`, token);
      process.stdout.write(
        pr.status === 200 ? (pr.cached ? 'CACHED\n' : 'OK\n') : `FAIL(${pr.status})\n`
      );
    }
  }

  if (course.hasExam) {
    process.stdout.write(`    → exam GenerateExam ... `);
    // 注意：GenerateExam 每次会生成新试卷，命中本地缓存就跳过；强制刷新用 --force
    const r = await getOrFetchJson(page, `${base}/api/Course/${link.courseId}/GenerateExam`, token);
    process.stdout.write(
      r.status === 200 ? (r.cached ? 'CACHED\n' : 'OK\n') : `FAIL(${r.status})\n`
    );
  }
}

/**
 * 自动遍历策略（基于 API，参考 sample/api/）
 *   1. 进入 dashboard，等待左侧导航渲染
 *   2. 从 ul.navigator 收集所有 /course/<id> 的 courseId
 *   3. 读取 ngStorage-authorizationData.token
 *   4. 对每门课程：
 *        GET /api/Course/<id>  → 拿到 lessons + hasExam
 *        for each lesson: GET /api/Pages/<lesson.id>
 *        if hasExam:      GET /api/Course/<id>/GenerateExam
 *   网络请求经由 page.fetch 触发，由 handleResponse 自动落盘到 mock_data/。
 */
async function autoTraverseByApi(page) {
  if (!(await gotoDashboard(page))) {
    console.log('[自动遍历] 未发现 ul.navigator，可能未登录或导航尚未渲染，放弃。');
    return;
  }

  const courses = await collectCourseIdsFromNav(page);
  console.log(`[自动遍历] 在导航中发现 ${courses.length} 门课程`);
  if (courses.length === 0) return;

  // 将courseId列表写盘，方便调试和后续使用
  await fs.outputJson(path.join(SAVE_DIR, 'course_list.json'), courses, { spaces: 2 });

  const token = await getAuthToken(page);
  if (!token) {
    console.warn('[自动遍历] 未读取到 Bearer token，请求可能被 401 拒绝（请确认已登录）');
  }

  for (let i = 0; i < courses.length; i++) {
    await processCourse(page, courses[i], i, courses.length, token);
  }

  console.log('\n[自动遍历] 完成。');
}

(async () => {
  await fs.ensureDir(SAVE_DIR);
  await fs.ensureDir(USER_DATA_DIR);

  console.log('启动浏览器...');
  console.log(`  目标域名:    ${TARGET_DOMAIN}`);
  console.log(`  数据目录:    ${path.relative(__dirname, SAVE_DIR)}/  (API JSON)`);
  console.log(`  资源目录:    ${path.relative(__dirname, PUBLIC_DIR)}/  (image / media / font)`);
  console.log(`  会话目录:    ${path.relative(__dirname, USER_DATA_DIR)}/`);
  console.log(`  无头模式:    ${HEADLESS}`);
  console.log(`  自动遍历:    ${AUTO}`);
  console.log(`  代理:        ${NO_PROXY ? '直连' : 'http://127.0.0.1:20171'}`);
  console.log(`  覆盖已有:    ${FORCE}\n`);

  const launchOpts = { headless: HEADLESS };
  if (!NO_PROXY) {
    launchOpts.proxy = { server: 'http://127.0.0.1:20171' };
  }

  // 持久化上下文：cookie / localStorage 都会落到 USER_DATA_DIR，下次无需重新登录
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, launchOpts);
  const page = context.pages()[0] || (await context.newPage());

  // 全局响应拦截
  context.on('response', handleResponse);

  console.log(`访问入口页：${ENTRY_URL}`);
  await safeGoto(page, ENTRY_URL, { waitUntil: 'networkidle', timeout: 60000 });

  console.log('\n======================================================');
  console.log('如未登录：请在浏览器中手动完成登录。');
  console.log('登录态会保存在 .playwright-data/ ，下次直接复用。');
  console.log('登录完成后，可在站内随意点击触发更多 API。');
  if (AUTO) {
    console.log('\n按下回车键开始自动遍历目录 ...');
    await waitForEnter();
    await autoTraverseByApi(page);
    console.log('\n自动遍历结束。按下回车键退出，或继续浏览后再按回车。');
    await waitForEnter();
  } else {
    console.log('完成后在终端按下 Ctrl+C 退出（数据已实时落盘）。');
    console.log('======================================================\n');
    // 阻塞，等待用户手动结束
    await new Promise(() => { });
  }

  console.log(`\n本次共保存 ${savedCount} 个新的 API 响应、${staticSavedCount} 个静态资源。`);
  await context.close();
  process.exit(0);
})();

function waitForEnter() {
  return new Promise((resolve) => {
    const onData = () => {
      process.stdin.removeListener('data', onData);
      try { process.stdin.pause(); } catch (_) { }
      resolve();
    };
    try { process.stdin.resume(); } catch (_) { }
    process.stdin.once('data', onData);
  });
}
