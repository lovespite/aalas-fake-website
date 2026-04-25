"use strict";

const express = require("express");
const {
  SESSION_MAX_DISTINCT_COURSES,
  SESSION_MAX_MOCK,
  SESSION_MAX_TOTAL_FETCH,
  MOCK_ALLOWED_COUNTS,
} = require("../config");
const { requireExamSession } = require("../middleware");
const { turnstileMiddleware } = require("../turnstile");
const {
  shuffle,
  loadQuestions,
  publicQuestion,
  findExamByCourseId,
  listQuestionIdsByExamId,
  listQuestionIdsByCourseIds,
} = require("../services/questions");
const { grade } = require("../services/grader");

const router = express.Router();

// 单课程整套题
router.get("/exam/course/:courseId", requireExamSession, (req, res) => {
  const courseId = Number(req.params.courseId);
  if (!Number.isFinite(courseId)) return res.status(400).json({ error: "invalid courseId" });

  const sess = req.examSession;
  if (sess.totalCount >= SESSION_MAX_TOTAL_FETCH) {
    return res.status(429).json({ error: "session_quota_exceeded" });
  }
  if (!sess.courses.has(courseId) && sess.courses.size >= SESSION_MAX_DISTINCT_COURSES) {
    return res.status(429).json({ error: "session_course_quota_exceeded" });
  }

  const exam = findExamByCourseId(courseId);
  if (!exam) return res.status(404).json({ error: "course not found" });

  sess.courses.add(courseId);
  sess.totalCount++;

  const qIds = listQuestionIdsByExamId(exam.id);
  const qs = loadQuestions(qIds).map(publicQuestion);
  res.json({
    mode: "course",
    examId: exam.id,
    courseId: exam.course_id,
    title: exam.title,
    questions: qs,
  });
});

// 模拟卷组卷
router.post("/exam/mock", requireExamSession, (req, res) => {
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
  if (courseIds.length === 0)
    return res.status(400).json({ error: "courseIds 必须为非空数组" });
  if (!MOCK_ALLOWED_COUNTS.includes(count))
    return res
      .status(400)
      .json({ error: `count 必须为 ${MOCK_ALLOWED_COUNTS.join(" / ")}` });

  const allQIds = listQuestionIdsByCourseIds(courseIds);
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

// 批阅
router.post("/exam/grade", turnstileMiddleware("turnstile/grade"), (req, res) => {
  const body = req.body || {};
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  if (Object.keys(answers).length === 0) {
    return res.status(400).json({ error: "answers 不能为空" });
  }
  const result = grade(answers);
  res.json(result);
});

module.exports = router;
