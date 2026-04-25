"use strict";

const db = require("../db");

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

function listCourses() {
  return db
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
}

function findExamByCourseId(courseId) {
  return db
    .prepare(`SELECT id, course_id, title FROM exams WHERE course_id = ? LIMIT 1`)
    .get(courseId);
}

function listQuestionIdsByExamId(examId) {
  return db
    .prepare(`SELECT id FROM questions WHERE exam_id = ? ORDER BY ordinal, id`)
    .all(examId)
    .map((r) => r.id);
}

function listQuestionIdsByCourseIds(courseIds) {
  if (courseIds.length === 0) return [];
  const placeholders = courseIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT q.id
         FROM questions q
         JOIN exams e ON e.id = q.exam_id
        WHERE e.course_id IN (${placeholders})`
    )
    .all(...courseIds)
    .map((r) => r.id);
}

module.exports = {
  shuffle,
  loadQuestions,
  publicQuestion,
  listCourses,
  findExamByCourseId,
  listQuestionIdsByExamId,
  listQuestionIdsByCourseIds,
};
