"use strict";

const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

const config = {
  PORT: Number(process.env.EXAM_PORT) || 3001,
  DB_PATH: path.join(ROOT, "exam.db"),
  PUBLIC_DIR: path.join(ROOT, "public", "exam"),

  // Cloudflare Turnstile
  TURNSTILE_SECRET: process.env.TURNSTILE_SECRET || "",
  TURNSTILE_VERIFY_URL: "https://challenges.cloudflare.com/turnstile/v0/siteverify",

  // Session 配额
  SESSION_TTL_MS: 60 * 60 * 1000,
  SESSION_MAX_DISTINCT_COURSES: 10,
  SESSION_MAX_MOCK: 5,
  SESSION_MAX_TOTAL_FETCH: 50,

  // IP 维度滑动窗口频控
  RATE_WINDOW_MS: 60 * 1000,
  RATE_MAX: 30,

  // 是否把考试会话绑定到 IP（生产置 EXAM_BIND_IP=1）
  BIND_SESSION_IP: process.env.EXAM_BIND_IP === "1",

  // 模拟卷允许的题量
  MOCK_ALLOWED_COUNTS: [30, 50, 100],
};

module.exports = config;
