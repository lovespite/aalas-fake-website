"use strict";

const crypto = require("crypto");
const { RATE_WINDOW_MS, RATE_MAX, BIND_SESSION_IP, SESSION_TTL_MS } = require("./config");

// ---------- Client IP ----------
function clientIp(req) {
  let raw = (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
    req.ip ||
    ""
  )
    .toString()
    .trim();
  // 规范化:剥掉 IPv6-mapped IPv4 前缀; 把 ::1 视作 127.0.0.1
  if (raw.startsWith("::ffff:")) raw = raw.slice(7);
  if (raw === "::1") raw = "127.0.0.1";
  return raw;
}

function clientIpMiddleware(req, _res, next) {
  req.clientIp = clientIp(req);
  next();
}

// ---------- 请求日志 ----------
function requestLogger(req, _res, next) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.originalUrl}`);
  next();
}

// ---------- IP 频控 ----------
const ipHits = new Map(); // ip -> number[] timestamps

function rateLimit(req, res, next) {
  const ip = req.clientIp || clientIp(req);
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

// ---------- 考试会话 ----------
// token -> { ip, createdAt, expiresAt, courses:Set, mockCount, totalCount }
const examSessions = new Map();

function newSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function createSession(ip) {
  const now = Date.now();
  const token = newSessionToken();
  const session = {
    ip,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    courses: new Set(),
    mockCount: 0,
    totalCount: 0,
  };
  examSessions.set(token, session);
  return { token, session };
}

function getSessionFromReq(req) {
  const token = req.get("x-exam-session") || (req.body && req.body.examSessionToken);
  if (!token) return { ok: false, code: "missing_session" };
  const s = examSessions.get(token);
  if (!s) {
    console.warn(
      `[session] invalid token=${token.slice(0, 8)}… ip=${req.clientIp || clientIp(req)}`
    );
    return { ok: false, code: "session_invalid" };
  }
  if (s.expiresAt <= Date.now()) {
    examSessions.delete(token);
    return { ok: false, code: "session_expired" };
  }
  if (BIND_SESSION_IP && s.ip && s.ip !== (req.clientIp || clientIp(req))) {
    console.warn(
      `[session] ip_mismatch session=${s.ip} now=${req.clientIp || clientIp(req)} token=${token.slice(0, 8)}…`
    );
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

// ---------- 周期清理 ----------
function startCleanup() {
  const handle = setInterval(() => {
    const now = Date.now();
    for (const [tok, s] of examSessions) {
      if (s.expiresAt <= now) examSessions.delete(tok);
    }
    for (const [ip, arr] of ipHits) {
      const fresh = arr.filter((t) => now - t < RATE_WINDOW_MS);
      if (fresh.length === 0) ipHits.delete(ip);
      else ipHits.set(ip, fresh);
    }
  }, 60 * 1000);
  handle.unref?.();
  return handle;
}

// ---------- 404 兜底 ----------
function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not Found", path: req.path });
}

module.exports = {
  clientIp,
  clientIpMiddleware,
  requestLogger,
  rateLimit,
  examSessions,
  createSession,
  getSessionFromReq,
  requireExamSession,
  startCleanup,
  notFoundHandler,
};
