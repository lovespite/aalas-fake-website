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
 *   GET  /api/exam/course/:courseId        → 课程小节考试（题目，无正确答案标记）
 *   POST /api/exam/mock                    → 模拟考试组卷 {courseIds, count}
 *   POST /api/exam/grade                   → 批阅 {answers: {qid: [aid,...]}}
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
// 适配 Bun 运行时：使用内置 bun:sqlite，无需原生编译
const { Database } = require("bun:sqlite");

const PORT = Number(process.env.EXAM_PORT) || 3001;
const DB_PATH = path.join(__dirname, "exam.db");
const PUBLIC_DIR = path.join(__dirname, "public", "exam");

if (!fs.existsSync(DB_PATH)) {
  console.error(`[fatal] 找不到数据库 ${DB_PATH}，请先运行: bun run exam:build`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
// bun:sqlite 没有 db.pragma()，统一用 exec 设置 PRAGMA
db.exec("PRAGMA foreign_keys = ON");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.use((req, _res, next) => {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${req.method} ${req.originalUrl}`);
  next();
});

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

app.get("/api/exam/course/:courseId", (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isFinite(courseId)) return res.status(400).json({ error: "invalid courseId" });

  const exam = db
    .prepare(`SELECT id, course_id, title FROM exams WHERE course_id = ? LIMIT 1`)
    .get(courseId);
  if (!exam) return res.status(404).json({ error: "course not found" });

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

app.post("/api/exam/mock", (req, res) => {
  const body = req.body || {};
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

  res.json({
    mode: "mock",
    examId: null,
    courseIds,
    requested: count,
    title: `模拟考试 (${qs.length} 题，来自 ${courseIds.length} 门课程)`,
    questions: qs,
  });
});

app.post("/api/exam/grade", (req, res) => {
  const body = req.body || {};
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

app.listen(PORT, () => {
  console.log("=========================================================");
  console.log(`Exam 服务已启动: http://localhost:${PORT}`);
  console.log(`  db:        ${DB_PATH}`);
  console.log(`  static:    ${PUBLIC_DIR}`);
  console.log("=========================================================");
});
