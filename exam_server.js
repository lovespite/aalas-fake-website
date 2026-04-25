"use strict";

/**
 * 考试网站后端入口
 * 数据来源：exam.db (由 build_exam_db.js 生成)
 *
 * 启动：
 *   bun run exam_server.js
 *   EXAM_PORT=4000 bun run exam_server.js
 *
 * 路由：
 *   GET  /                                 → public/exam/index.html
 *   GET  /api/courses                      → 课程列表
 *   POST /api/session/start                → 验证 Turnstile 后颁发考试会话 token
 *   GET  /api/exam/course/:courseId        → 课程小节考试（需 X-Exam-Session）
 *   POST /api/exam/mock                    → 模拟考试组卷（需 X-Exam-Session）
 *   POST /api/exam/grade                   → 批阅 (Turnstile + 可选 session)
 *
 * 实际业务实现拆分到 src/exam/ 下：
 *   - config.js              环境/常量
 *   - db.js                  bun:sqlite 只读连接
 *   - turnstile.js           Cloudflare Turnstile 校验 + 中间件
 *   - middleware.js          IP 提取 / 日志 / 频控 / 会话管理 / 清理 / 404
 *   - services/questions.js  题目/课程查询封装
 *   - services/grader.js     批阅逻辑
 *   - routes/*.js            按职责拆分的 Router
 *   - app.js                 createApp() 装配 express 应用
 */

const {
  PORT,
  DB_PATH,
  PUBLIC_DIR,
  TURNSTILE_SECRET,
  BIND_SESSION_IP,
} = require("./src/exam/config");
const { createApp } = require("./src/exam/app");

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
  console.log("=========================================================");
  console.log(`Exam 服务已启动: http://localhost:${PORT}`);
  console.log(`  db:        ${DB_PATH}`);
  console.log(`  static:    ${PUBLIC_DIR}`);
  console.log(`  turnstile: ${TURNSTILE_SECRET ? "ENABLED" : "DISABLED (set TURNSTILE_SECRET)"}`);
  console.log(`  bindIp:    ${BIND_SESSION_IP ? "ON (EXAM_BIND_IP=1)" : "OFF"}`);
  console.log("=========================================================");
});
