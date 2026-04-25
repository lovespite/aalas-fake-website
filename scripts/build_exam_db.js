"use strict";

const fs = require("fs");
const path = require("path");
// 适配 Bun 运行时：使用内置 bun:sqlite，无需原生编译
const { Database } = require("bun:sqlite");

const ROOT = __dirname;
const COURSE_DIR = path.join(ROOT, "..", "mock_data", "api", "Course");
const EXAM_DIR = path.join(ROOT, "..", "mock_data", "api", "Exam");
const DB_PATH = path.join(ROOT, "..", "exam.db");

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exams;

CREATE TABLE exams (
  id         INTEGER PRIMARY KEY,
  course_id  INTEGER NOT NULL,
  title      TEXT,
  source     TEXT NOT NULL
);

CREATE TABLE questions (
  id        INTEGER PRIMARY KEY,
  exam_id   INTEGER NOT NULL,
  ordinal   INTEGER,
  type      INTEGER NOT NULL,
  title     TEXT,
  content   TEXT,
  image     TEXT,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE answers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL,
  answer_id    INTEGER,
  ordinal      INTEGER,
  content      TEXT,
  is_correct   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (question_id, answer_id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_questions_exam ON questions(exam_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_exams_course ON exams(course_id);
`;

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalize(s) {
  if (s == null) return "";
  return String(s).replace(/\s+/g, " ").trim();
}

function pickCorrectAnswerIds(question, resultQuestion) {
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (answers.length === 0) return new Set();

  if (!resultQuestion || !Array.isArray(resultQuestion.answers) || resultQuestion.answers.length === 0) {
    return new Set([answers[0].id]);
  }

  const wanted = resultQuestion.answers.map((a) => normalize(a && a.content));
  const correct = new Set();

  for (const w of wanted) {
    const match = answers.find((a) => normalize(a.content) === w);
    if (match) correct.add(match.id);
  }

  if (correct.size === 0) {
    correct.add(answers[0].id);
  }
  return correct;
}

function loadExamResult(examId) {
  const p = path.join(EXAM_DIR, `${examId}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return readJson(p);
  } catch (err) {
    console.warn(`[warn] failed to parse exam result ${p}: ${err.message}`);
    return null;
  }
}

function main() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = new Database(DB_PATH);
  db.exec(SCHEMA_SQL);

  const insertExam = db.prepare(
    "INSERT OR REPLACE INTO exams (id, course_id, title, source) VALUES (?, ?, ?, ?)"
  );
  const insertQuestion = db.prepare(
    "INSERT OR REPLACE INTO questions (id, exam_id, ordinal, type, title, content, image) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertAnswer = db.prepare(
    "INSERT INTO answers (question_id, answer_id, ordinal, content, is_correct) VALUES (?, ?, ?, ?, ?)"
  );

  const courseDirs = fs
    .readdirSync(COURSE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let examCount = 0;
  let questionCount = 0;
  let answerCount = 0;
  let withResult = 0;
  let withoutResult = 0;
  const skipped = [];

  const tx = db.transaction((courseId) => {
    const examPath = path.join(COURSE_DIR, courseId, "GenerateExam.json");
    if (!fs.existsSync(examPath)) {
      skipped.push(`${courseId}: missing GenerateExam.json`);
      return;
    }

    let exam;
    try {
      exam = readJson(examPath);
    } catch (err) {
      skipped.push(`${courseId}: parse error: ${err.message}`);
      return;
    }

    if (!exam || typeof exam.id !== "number" || !Array.isArray(exam.questions)) {
      skipped.push(`${courseId}: invalid GenerateExam.json shape`);
      return;
    }

    const result = loadExamResult(exam.id);
    if (result) withResult++;
    else withoutResult++;

    const resultQuestionsById = new Map();
    if (result && Array.isArray(result.questions)) {
      for (const rq of result.questions) {
        if (rq && rq.id != null) resultQuestionsById.set(rq.id, rq);
      }
    }

    insertExam.run(exam.id, Number(courseId), exam.title || null, path.relative(ROOT, examPath).replace(/\\/g, "/"));
    examCount++;

    exam.questions.forEach((q, qIdx) => {
      const ordinal = typeof q.ordinal === "number" ? q.ordinal : qIdx;
      insertQuestion.run(
        q.id,
        exam.id,
        ordinal,
        q.type || 1,
        q.title || null,
        q.content || null,
        q.image || null
      );
      questionCount++;

      const correctIds = pickCorrectAnswerIds(q, resultQuestionsById.get(q.id));
      const answers = Array.isArray(q.answers) ? q.answers : [];
      answers.forEach((a, aIdx) => {
        insertAnswer.run(
          q.id,
          a.id != null ? a.id : null,
          aIdx,
          a.content || null,
          correctIds.has(a.id) ? 1 : 0
        );
        answerCount++;
      });
    });
  });

  for (const courseId of courseDirs) {
    try {
      tx(courseId);
    } catch (err) {
      skipped.push(`${courseId}: ${err.message}`);
    }
  }

  db.close();

  console.log(`Done. DB: ${DB_PATH}`);
  console.log(`  exams:       ${examCount}`);
  console.log(`  questions:   ${questionCount}`);
  console.log(`  answers:     ${answerCount}`);
  console.log(`  with result: ${withResult}`);
  console.log(`  no result:   ${withoutResult} (defaulted to first answer)`);
  if (skipped.length) {
    console.log(`  skipped (${skipped.length}):`);
    for (const s of skipped) console.log(`    - ${s}`);
  }
}

main();
