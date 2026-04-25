"use strict";

/**
 * 考试网站后端
 * 数据来源：exam.db (由 build_exam_db.js 生成)
 *
 * 启动：
 *   node exam_server.js              # 默认 3001 端口
 *   EXAM_PORT=4000 node exam_server.js
 *
 * 路由：
 *   GET  /                                 → public/exam/index.html
 *   GET  /api/courses                      → 课程列表
 *   POST /api/session/start                → 验证 Turnstile 后颁发考试会话 token
 *   GET  /api/exam/course/:courseId        → 课程小节考试（需 X-Exam-Session）
 *   POST /api/exam/mock                    → 模拟考试组卷（需 X-Exam-Session）
 *   POST /api/exam/grade                   → 批阅 (Turnstile + 可选 session)
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
// 适配 Bun 运行时：使用内置 bun:sqlite，无需原生编译
const { Database } = require("bun:sqlite");

const PORT = Number(process.env.EXAM_PORT) || 3001;
const DB_PATH = path.join(__dirname, "exam.db");
const PUBLIC_DIR = path.join(__dirname, "public", "exam");

// === Cloudflare Turnstile 后端校验配置 ===
// 在环境变量中设置 Secret Key:
//   TURNSTILE_SECRET=xxxxxxxxxxxxxxxxxxxx bun run exam:serve
// 测试时可使用官方 dummy secret:1x0000000000000000000000000000000AA(始终通过)
// 若未配置 TURNSTILE_SECRET,服务端会跳过校验并打印告警(便于本地开发)。
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
if (!TURNSTILE_SECRET) {
  console.warn("[warn] 未设置 TURNSTILE_SECRET,/api/exam/grade 将跳过人机验证(仅适合本地开发)。");
} else {
  console.log("[info] 已配置 TURNSTILE_SECRET, /api/exam/grade 将启用人机验证。");
}

async function verifyTurnstile(token, remoteip) {
  if (!TURNSTILE_SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: "missing-cf-turnstile-response" };
  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const r = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json();
    if (data.success) return { ok: true, data };
    return { ok: false, error: (data["error-codes"] || []).join(",") || "verify-failed", data };
  } catch (e) {
    return { ok: false, error: "verify-exception:" + e.message };
  }
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`[fatal] 找不到数据库 ${DB_PATH}，请先运行: bun run exam:build`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
// bun:sqlite 没有 db.pragma()，统一用 exec 设置 PRAGMA
db.exec("PRAGMA foreign_keys = ON");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", true); // 使 req.ip 在 Cloudflare/反向代理后也可用
app.use(express.json({ limit: "2mb" }));

app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.originalUrl}`);
  next();
});

// ---------- 考试会话 + 频控 ----------
// 会话存放在内存，重启即失效（单实例够用，多实例需换 Redis）。
const SESSION_TTL_MS = 60 * 60 * 1000;          // 1h
const SESSION_MAX_DISTINCT_COURSES = 10;        // 每个 session 最多取 10 门不同课程的整套题
const SESSION_MAX_MOCK = 5;                     // 每个 session 最多生成 5 次模拟卷
const SESSION_MAX_TOTAL_FETCH = 50;             // 单 session 总取卷次数硬上限

// 简单 IP 维度滑动窗口：60 秒内最多 30 次 /api/exam/* 或 /api/session/*
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;

// 是否把考试会话绑定到 IP。
// 默认关闭：本地开发/双栈/IPv6/移动网络下 IP 容易在两次请求间漂移，
// 反复触发 session_ip_mismatch -> 重发 Turnstile -> 死循环。
// 生产环境置 EXAM_BIND_IP=1 启用。
const BIND_SESSION_IP = process.env.EXAM_BIND_IP === "1";

const examSessions = new Map(); // token -> { ip, createdAt, expiresAt, courses:Set, mockCount, totalCount }
const ipHits = new Map();       // ip -> number[] timestamps

// 周期清理
setInterval(() => {
  const now = Date.now();
  for (const [tok, s] of examSessions) {
    if (s.expiresAt <= now) examSessions.delete(tok);
  }
  for (const [ip, arr] of ipHits) {
    const fresh = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, fresh);
  }
}, 60 * 1000).unref?.();

function clientIp(req) {
  let raw = (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.ip ||
    ""
  ).toString().trim();
  // 规范化:剥掉 IPv6-mapped IPv4 前缀; 把 ::1 视作 127.0.0.1
  if (raw.startsWith("::ffff:")) raw = raw.slice(7);
  if (raw === "::1") raw = "127.0.0.1";
  return raw;
}

function rateLimit(req, res, next) {
  const ip = clientIp(req);
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    res.set("Retry-After", "60");
    return res.status(429).json({ error: "rate_limited", retryAfter: 60 });
  }
  arr.push(now);
  ipHits.set(ip, arr);
  next();
}

function newSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getSessionFromReq(req) {
  const token = req.get("x-exam-session") || (req.body && req.body.examSessionToken);
  if (!token) return { ok: false, code: "missing_session" };
  const s = examSessions.get(token);
  if (!s) {
    console.warn(`[session] invalid token=${token.slice(0, 8)}… ip=${clientIp(req)}`);
    return { ok: false, code: "session_invalid" };
  }
  if (s.expiresAt <= Date.now()) {
    examSessions.delete(token);
    return { ok: false, code: "session_expired" };
  }
  if (BIND_SESSION_IP && s.ip && s.ip !== clientIp(req)) {
    console.warn(`[session] ip_mismatch session=${s.ip} now=${clientIp(req)} token=${token.slice(0, 8)}…`);
    return { ok: false, code: "session_ip_mismatch" };
  }
  return { ok: true, token, session: s };
}

function requireExamSession(req, res, next) {
  const r = getSessionFromReq(req);
  if (!r.ok) return res.status(401).json({ error: r.code });
  req.examSession = r.session;
  req.examSessionToken = r.token;
  next();
}

// ---------- 工具 ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadQuestions(questionIds) {
  if (questionIds.length === 0) return [];
  const placeholders = questionIds.map(() => "?").join(",");
  const qs = db
    .prepare(
      `SELECT q.id, q.exam_id, q.type, q.title, q.content, q.image, q.ordinal,
              e.course_id, e.title AS exam_title
         FROM questions q
         JOIN exams e ON e.id = q.exam_id
        WHERE q.id IN (${placeholders})`
    )
    .all(...questionIds);

  const ans = db
    .prepare(
      `SELECT question_id, answer_id, ordinal, content, is_correct
         FROM answers
        WHERE question_id IN (${placeholders})
        ORDER BY question_id, ordinal`
    )
    .all(...questionIds);

  const ansByQ = new Map();
  for (const a of ans) {
    if (!ansByQ.has(a.question_id)) ansByQ.set(a.question_id, []);
    ansByQ.get(a.question_id).push(a);
  }

  // 维持传入顺序
  const byId = new Map(qs.map((q) => [q.id, q]));
  return questionIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q) => ({
      ...q,
      answers: shuffle(ansByQ.get(q.id) || []),
    }));
}

function publicQuestion(q) {
  return {
    id: q.id,
    type: q.type,
    title: q.title,
    content: q.content,
    image: q.image,
    courseId: q.course_id,
    examTitle: q.exam_title,
    answers: q.answers.map((a) => ({ id: a.answer_id, content: a.content })),
  };
}

// ---------- API ----------
// 全局给 /api/exam/* 与 /api/session/* 套上 IP 频控
app.use(["/api/exam", "/api/session"], rateLimit);

// 颁发考试会话 token：必须先通过 Cloudflare Turnstile
app.post("/api/session/start", async (req, res) => {
  const body = req.body || {};
  const cfToken = body.cfTurnstileResponse || req.get("cf-turnstile-response");
  const ip = clientIp(req);
  const verify = await verifyTurnstile(cfToken, ip);
  if (!verify.ok) {
    console.warn("[turnstile] /session/start 校验失败:", verify.error);
    return res.status(403).json({ error: "captcha_failed", reason: verify.error });
  }
  const token = newSessionToken();
  const now = Date.now();
  const session = {
    ip,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    courses: new Set(),
    mockCount: 0,
    totalCount: 0,
  };
  examSessions.set(token, session);
  console.log(`[session] new token=${token.slice(0, 8)}… ip=${ip} bindIp=${BIND_SESSION_IP}`);
  res.json({
    token,
    expiresAt: session.expiresAt,
    ttlMs: SESSION_TTL_MS,
    quota: {
      maxDistinctCourses: SESSION_MAX_DISTINCT_COURSES,
      maxMock: SESSION_MAX_MOCK,
      maxTotal: SESSION_MAX_TOTAL_FETCH,
    },
  });
});

app.get("/api/courses", (_req, res) => {
  const rows = db
    .prepare(
      `SELECT e.course_id   AS courseId,
              e.id          AS examId,
              e.title       AS title,
              COUNT(q.id)   AS questionCount
         FROM exams e
         LEFT JOIN questions q ON q.exam_id = e.id
        GROUP BY e.id
        ORDER BY e.title COLLATE NOCASE`
    )
    .all();
  res.json(rows);
});

app.get("/api/exam/course/:courseId", requireExamSession, (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isFinite(courseId)) return res.status(400).json({ error: "invalid courseId" });

  const sess = req.examSession;
  if (sess.totalCount >= SESSION_MAX_TOTAL_FETCH) {
    return res.status(429).json({ error: "session_quota_exceeded" });
  }
  if (!sess.courses.has(courseId) && sess.courses.size >= SESSION_MAX_DISTINCT_COURSES) {
    return res.status(429).json({ error: "session_course_quota_exceeded" });
  }

  const exam = db
    .prepare(`SELECT id, course_id, title FROM exams WHERE course_id = ? LIMIT 1`)
    .get(courseId);
  if (!exam) return res.status(404).json({ error: "course not found" });

  sess.courses.add(courseId);
  sess.totalCount++;

  const qIds = db
    .prepare(`SELECT id FROM questions WHERE exam_id = ? ORDER BY ordinal, id`)
    .all(exam.id)
    .map((r) => r.id);

  const qs = loadQuestions(qIds).map(publicQuestion);
  res.json({
    mode: "course",
    examId: exam.id,
    courseId: exam.course_id,
    title: exam.title,
    questions: qs,
  });
});

app.post("/api/exam/mock", requireExamSession, (req, res) => {
  const body = req.body || {};
  const sess = req.examSession;
  if (sess.totalCount >= SESSION_MAX_TOTAL_FETCH) {
    return res.status(429).json({ error: "session_quota_exceeded" });
  }
  if (sess.mockCount >= SESSION_MAX_MOCK) {
    return res.status(429).json({ error: "session_mock_quota_exceeded" });
  }

  const courseIds = Array.isArray(body.courseIds)
    ? body.courseIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))
    : [];
  const count = Number(body.count);
  if (courseIds.length === 0) return res.status(400).json({ error: "courseIds 必须为非空数组" });
  if (![30, 50, 100].includes(count)) return res.status(400).json({ error: "count 必须为 30 / 50 / 100" });

  const placeholders = courseIds.map(() => "?").join(",");
  const allQIds = db
    .prepare(
      `SELECT q.id
         FROM questions q
         JOIN exams e ON e.id = q.exam_id
        WHERE e.course_id IN (${placeholders})`
    )
    .all(...courseIds)
    .map((r) => r.id);

  if (allQIds.length === 0) return res.status(404).json({ error: "所选课程无题目" });

  const picked = shuffle(allQIds).slice(0, Math.min(count, allQIds.length));
  const qs = loadQuestions(picked).map(publicQuestion);

  sess.mockCount++;
  sess.totalCount++;

  res.json({
    mode: "mock",
    examId: null,
    courseIds,
    requested: count,
    title: `模拟考试 (${qs.length} 题，来自 ${courseIds.length} 门课程)`,
    questions: qs,
  });
});

app.post("/api/exam/grade", async (req, res) => {
  const body = req.body || {};

  // —— Cloudflare Turnstile 人机验证 ——
  const cfToken = body.cfTurnstileResponse || req.get("cf-turnstile-response");
  const remoteip = (req.headers["cf-connecting-ip"] || req.ip || "").toString();
  const verify = await verifyTurnstile(cfToken, remoteip);
  if (!verify.ok) {
    console.warn("[turnstile] 校验失败:", verify.error);
    return res.status(403).json({ error: "captcha_failed", reason: verify.error });
  }

  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const qIds = Object.keys(answers).map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (qIds.length === 0) return res.status(400).json({ error: "answers 不能为空" });

  const placeholders = qIds.map(() => "?").join(",");
  const qRows = db
    .prepare(`SELECT id, type, title, content, image FROM questions WHERE id IN (${placeholders})`)
    .all(...qIds);
  const aRows = db
    .prepare(
      `SELECT question_id, answer_id, ordinal, content, is_correct
         FROM answers
        WHERE question_id IN (${placeholders})
        ORDER BY question_id, ordinal`
    )
    .all(...qIds);

  const ansByQ = new Map();
  for (const a of aRows) {
    if (!ansByQ.has(a.question_id)) ansByQ.set(a.question_id, []);
    ansByQ.get(a.question_id).push(a);
  }
  const qById = new Map(qRows.map((q) => [q.id, q]));

  let total = 0;
  let correctCount = 0;
  const wrong = [];

  for (const qid of qIds) {
    const q = qById.get(qid);
    if (!q) continue;
    total++;

    const opts = ansByQ.get(qid) || [];
    const correctIds = new Set(opts.filter((o) => o.is_correct).map((o) => o.answer_id));
    const submitted = Array.isArray(answers[qid]) ? answers[qid] : [answers[qid]];
    const submittedSet = new Set(
      submitted
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x))
    );

    const isCorrect =
      submittedSet.size === correctIds.size &&
      [...submittedSet].every((x) => correctIds.has(x));

    if (isCorrect) {
      correctCount++;
    } else {
      wrong.push({
        id: q.id,
        type: q.type,
        title: q.title,
        content: q.content,
        image: q.image,
        answers: opts.map((o) => ({ id: o.answer_id, content: o.content })),
        correct: [...correctIds],
        your: [...submittedSet],
      });
    }
  }

  res.json({
    total,
    correct: correctCount,
    wrongCount: wrong.length,
    score: total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0,
    wrong,
  });
});

// ---------- 静态 ----------
app.use(express.static(PUBLIC_DIR, { extensions: ["html"], maxAge: 0 }));

app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("=========================================================");
  console.log(`Exam 服务已启动: http://localhost:${PORT}`);
  console.log(`  db:        ${DB_PATH}`);
  console.log(`  static:    ${PUBLIC_DIR}`);
  console.log(`  turnstile: ${TURNSTILE_SECRET ? "ENABLED" : "DISABLED (set TURNSTILE_SECRET)"}`);
  console.log(`  bindIp:    ${BIND_SESSION_IP ? "ON (EXAM_BIND_IP=1)" : "OFF"}`);
  console.log("=========================================================");
});
