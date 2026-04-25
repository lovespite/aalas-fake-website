'use strict';
/**
 * 生成 mock_data/_index/courses.json，供 SW 处理 /api/SearchTitle/:q
 * 输出格式：[{ id, title }]
 *
 * 用法：
 *   bun run scripts/build_search_index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COURSE_DIR = path.join(ROOT, 'mock_data', 'api', 'Course');
const OUT_DIR = path.join(ROOT, 'mock_data', '_index');
const OUT_FILE = path.join(OUT_DIR, 'courses.json');

if (!fs.existsSync(COURSE_DIR)) {
  console.error(`[FATAL] 找不到课程目录: ${COURSE_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(COURSE_DIR).filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));
const out = [];
let skipped = 0;

for (const f of files) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, f), 'utf8'));
    if (j && j.id) out.push({ id: j.id, title: String(j.title || '') });
  } catch (_) { skipped++; }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out));
console.log(`[ok] ${out.length} courses → ${path.relative(ROOT, OUT_FILE)} (skipped=${skipped})`);
