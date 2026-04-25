"use strict";

const db = require("../db");

/**
 * 批阅一份提交的答卷。
 * @param {Record<string|number, number|number[]>} answers
 *        题目 id -> 用户选中的答案 id（单选可为单值，多选为数组）
 * @returns {{
 *   total: number, correct: number, wrongCount: number,
 *   score: number, wrong: Array<{
 *     id:number, type:number, title:string, content:string, image:string|null,
 *     answers: Array<{id:number, content:string}>,
 *     correct:number[], your:number[]
 *   }>
 * }}
 */
function grade(answers) {
  const qIds = Object.keys(answers || {})
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
  if (qIds.length === 0) {
    return { total: 0, correct: 0, wrongCount: 0, score: 0, wrong: [] };
  }

  const placeholders = qIds.map(() => "?").join(",");
  const qRows = db
    .prepare(
      `SELECT id, type, title, content, image FROM questions WHERE id IN (${placeholders})`
    )
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
      submitted.map((x) => Number(x)).filter((x) => Number.isFinite(x))
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

  return {
    total,
    correct: correctCount,
    wrongCount: wrong.length,
    score: total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0,
    wrong,
  };
}

module.exports = { grade };
