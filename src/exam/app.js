"use strict";

const path = require("path");
const express = require("express");

const { PUBLIC_DIR } = require("./config");
const {
  clientIpMiddleware,
  requestLogger,
  rateLimit,
  notFoundHandler,
  startCleanup,
} = require("./middleware");

const coursesRouter = require("./routes/courses");
const sessionRouter = require("./routes/session");
const examRouter = require("./routes/exam");

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true); // 在 Cloudflare/反向代理后也能拿到真实 IP

  // ---------- 全局中间件 ----------
  app.use(express.json({ limit: "2mb" }));
  app.use(clientIpMiddleware);
  app.use(requestLogger);

  // ---------- API 频控（仅作用于 /api/exam 与 /api/session） ----------
  app.use(["/api/exam", "/api/session"], rateLimit);

  // ---------- API 路由 ----------
  app.use("/api", coursesRouter);
  app.use("/api", sessionRouter);
  app.use("/api", examRouter);

  // ---------- 静态资源 ----------
  app.use(express.static(PUBLIC_DIR, { extensions: ["html"], maxAge: 0 }));
  app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

  // ---------- 404 ----------
  app.use(notFoundHandler);

  // 后台清理任务（会话过期 + 频控窗口）
  startCleanup();

  return app;
}

module.exports = { createApp };
