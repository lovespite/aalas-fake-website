# AALAS 离线题库 / 站点 Mock 工程

> 本项目将一个原本依赖鉴权的 AngularJS (1.x) SPA 完整离线化，并基于其题库数据构建了一个独立的本地考试练习站点。

## 🎯 项目概览

工程包含两条相互独立、可单独使用的产品线：

| 产线 | 入口 | 端口 | 数据源 | 用途 |
|---|---|---|---|---|
| ① 原站镜像 Mock | `server.js` | 3000 | `public/` + `mock_data/` | 离线还原 AngularJS 站点的浏览体验 |
| ② 题库练习站点 | `exam_server.js` | 3001 | `exam.db` (SQLite) | 基于整理后的题库做单课考试 / 模拟考试 |

> 两个 server **完全独立**，可以只跑其中一个；也可以同时启动监听不同端口。

---

## 📂 目录结构

```
.
├── public/                     原站静态资源（HTML / CSS / JS / bower_components）
│   └── exam/                   ② 题库练习站点的前端（原生 JS，无框架）
├── mock_data/
│   └── api/                    ① 原站镜像所需的 API JSON 快照
│       ├── Course/[id]/GenerateExam.json
│       └── Exam/[examId].json
│
├── go-fetch.js                 阶段一：Playwright 抓取站点静态资源 → public/
├── fetch_api_data.js           阶段二：Playwright 拦截并保存 API 响应 → mock_data/
├── server.js                   ① 原站 Mock 服务器
│
├── build_exam_db.js            题库整合脚本：mock_data/api/Course + Exam → exam.db
├── exam.db                     SQLite 题库（由 build_exam_db.js 生成）
├── exam_server.js              ② 题库练习站点后端 + 静态托管
│
├── package.json
└── README.md
```

---

## 🚀 快速开始

### 安装依赖

```bash
yarn install
```

主要依赖：`express`、`fs-extra`、`playwright`、`better-sqlite3`。

### 一行命令启动

| 命令 | 说明 |
|---|---|
| `yarn start` / `yarn serve` | 启动**原站镜像**（http://localhost:3000） |
| `yarn exam:build` | （重新）构建 `exam.db` |
| `yarn exam:serve` | 启动**题库练习站点**（http://localhost:3001） |
| `yarn fetch:assets` | 重新抓取原站静态资源 |
| `yarn fetch:api` | 重新拦截/录制原站 API 数据（手动模式） |
| `yarn fetch:api:auto` | 自动模式拦截 API |

---

## ① 原站镜像 Mock — `server.js`

**目的**：在脱机环境下完整重现原 AngularJS SPA 的浏览体验（鉴权、路由、API 全部本地化）。

**实现思路**

1. **前端原封保留** — 直接静态托管 `public/`，不重打包。
2. **API Mock** — 凡是命中 `/api/*` 的请求都映射到 `mock_data/api/...` 下对应的 JSON 文件返回；命名规则与 `fetch_api_data.js` 一致（带 query 时附 `__q_<md5前8位>`，非 GET 方法附 `.POST` 等后缀）。
3. **鉴权伪装** — `POST /token` 总是签发一枚 mock token；HTML 响应被注入一段脚本，自动写入 `sessionStorage.ngStorage-authorizationData`，**任意账号密码即可登录**，刷新页面不会丢登录态。
4. **HTML5 路由兜底** — 兼容 `html5Mode`，深链接（如 `/app/library/course/3`）回退到 `dashboard.html`，但保护 `/assets`、`/bower_components` 等真静态目录不被兜底污染。

**特殊接口**

- `POST /api/Exam/SaveAnswer/:examId/:questionId/:answerId` — 模拟保存答题
- `POST /api/Exam/ScoreExam` — 模拟评分
- `POST /api/Page/:id` — 永远返回 `{ hasExam: true, status: "active" }`

**启动**

```bash
node server.js              # 默认 3000 端口
PORT=8080 node server.js    # 指定端口
```

入口：<http://localhost:3000>，自动跳转到 `/app/dashboard.html`。

---

## ② 题库练习站点 — `exam_server.js`

**目的**：将原站零散的考试 JSON 整合为统一的可练习题库，提供独立的"刷题/模拟考"网站，可脱离原站独立运行。

### 数据建模 — `build_exam_db.js`

遍历 `mock_data/api/Course/[courseId]/GenerateExam.json` 与 `mock_data/api/Exam/[examId].json`，输出 SQLite `exam.db`，三张表：

| 表 | 字段 |
|---|---|
| `exams` | `id`, `course_id`, `title`, `source` |
| `questions` | `id`, `exam_id`, `ordinal`, `type` (1=单选 / 2=多选), `title`, `content`, `image` |
| `answers` | `id`, `question_id`, `answer_id`, `ordinal`, `content`, `is_correct` |

**正确答案推断规则**：考试结果文件中只记录"错题"，所以：
- 若结果文件中存在该题 → 用 `result.answers[i].content` 在题目选项中按文本匹配标记 `is_correct=1`（多选会标多个）。
- 若结果文件中**未出现**该题 → 默认 `q.answers[0]` 为正确答案。

> 重新运行 `yarn exam:build` 会**重建**整张库（先 drop 后 create）。

### 后端 API

| Method | Path | 说明 |
|---|---|---|
| GET  | `/api/courses` | 课程列表（带题量统计） |
| GET  | `/api/exam/course/:courseId` | 指定课程的全部题目（不含正确性标记） |
| POST | `/api/exam/mock` | 模拟考试组卷 `{courseIds:[...], count:30\|50\|100}` |
| POST | `/api/exam/grade` | 服务端批阅 `{answers:{qid:[aid,...]}}` → 返回总分 + 仅错题 |

> 选项顺序在下发时会被打乱，正确答案永远不在 GET/POST 题目接口中泄露。

### 前端 — `public/exam/`

原生 JS（无框架）+ hash 路由：

- `#/` 首页：两种模式入口、未提交考试续做
- `#/course` 课程小节考试：搜索 → 点击直接开考
- `#/mock` 模拟考试：勾选课程 + 选择 30/50/100 题；含 **ALAT / LAT / LATG** 前缀快选预设
- `#/take` 答题：单/多选自适应、可标记题目（★）、右侧 sticky 题目地图（已答=绿、标记=黄、未答=灰，移动端 ≤820px 自动隐藏）、进度条、答案实时存入 `localStorage`
- `#/result` 结果：分数、对错统计；红=你的错选，绿=正确答案

辅助模块：
- `modal.js` — H5 风格 Modal，统一替代 `alert/confirm`
- `policy.js` — 中英双语使用政策（版权 / 禁商用 / 禁拷贝再分发 / 仅限学习），首次访问强制阅读 ≥10 秒方可"我已知晓"

### 启动

```bash
yarn exam:build          # 首次（或题库变化后）重建 exam.db
yarn exam:serve          # 启动 → http://localhost:3001
EXAM_PORT=4000 node exam_server.js   # 指定端口
```

---

## 🛠 数据采集工具链（可选）

完整流程是 "**抓资源 → 录 API → 起服务**"，但仓库已自带产物，常规使用**无需重新抓取**。

1. `go-fetch.js` — Playwright 自动化抓取 `public/`（已完成，可重跑刷新）。
2. `fetch_api_data.js` — Playwright 在登录态下拦截所有 `/api/*` 响应并按 URL 映射写入 `mock_data/api/`，是构建 `exam.db` 的上游数据源。

---

## 📜 使用条款

本项目由 **Lovespite** 创作，**Copyright © 2026 Lovespite. All Rights Reserved.**

- ❌ 禁止任何商业用途
- ❌ 禁止拷贝、二次创作、再分发
- ✅ 仅供个人学习使用

详见站点页脚的"使用政策 / Usage Policy"。
