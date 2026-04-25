"use strict";

const $app = document.getElementById("app");
const STORAGE_KEY = "aalas_exam_session_v1";

// === Cloudflare Turnstile 配置 ===
// 替换为你在 Cloudflare Dashboard 创建的 Site Key。
// 测试时可使用官方 dummy key：1x00000000000000000000AA（始终通过）。
// const TURNSTILE_SITE_KEY = "0x4AAAAAADDHoMAjJ5JCICcf";
const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

let coursesCache = null;

// ----------------- 工具 -----------------
function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function render(node) {
  clear($app);
  $app.appendChild(node);
  window.scrollTo(0, 0);
}

async function api(method, url, body, opts) {
  opts = opts || {};
  const headers = body ? { "Content-Type": "application/json" } : {};
  // 优先使用 opts.examSessionToken 显式传入(避免 sessionStorage 不可写时静默失败);
  // 兜底再回退到 sessionStorage。
  if (/^\/api\/exam\//.test(url) && !opts.skipExamSession) {
    const tok = opts.examSessionToken || getStoredExamSessionToken();
    if (tok) headers["X-Exam-Session"] = tok;
    else console.warn("[examApi] /api/exam/* 调用但没有可用的会话 token,将被后端拒绝");
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let payload = null;
    try { payload = await res.json(); msg = payload.error || msg; } catch (_) { }
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return res.json();
}

async function getCourses() {
  if (!coursesCache) coursesCache = await api("GET", "/api/courses");
  return coursesCache;
}

function saveSession(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) { }
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) { return null; }
}
function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { }
}

// ===== 考试 API 会话（Turnstile -> /api/session/start 颁发）=====
function getStoredExamSession() {
  try {
    const raw = sessionStorage.getItem(EXAM_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.token || !s.expiresAt) return null;
    // 提前 30s 视为过期，避免边界
    if (s.expiresAt - 30_000 < Date.now()) return null;
    return s;
  } catch (_) { return null; }
}
function getStoredExamSessionToken() {
  const s = getStoredExamSession();
  return s ? s.token : null;
}
function clearExamSession() {
  try { sessionStorage.removeItem(EXAM_SESSION_KEY); } catch (_) { }
}
async function ensureExamSession(force) {
  if (!force) {
    const s = getStoredExamSession();
    if (s) return s;
  }
  clearExamSession();
  const cfToken = await requestTurnstileToken("exam-start");
  if (!cfToken) throw new Error("人机验证未通过");
  const data = await api("POST", "/api/session/start", { cfTurnstileResponse: cfToken },
    { skipExamSession: true });
  if (!data || !data.token) {
    console.error("[examSession] /api/session/start 返回异常:", data);
    throw new Error("服务器未返回会话 token");
  }
  const sess = { token: data.token, expiresAt: data.expiresAt, quota: data.quota };
  try {
    sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(sess));
    if (!sessionStorage.getItem(EXAM_SESSION_KEY)) {
      console.warn("[examSession] sessionStorage 写入后读不到,后续仅用内存 token");
    }
  } catch (e) {
    console.warn("[examSession] sessionStorage 写入失败:", e);
  }
  console.log("[examSession] 新会话 token=" + data.token.slice(0, 8) + "… expiresAt=" + new Date(data.expiresAt).toISOString());
  return sess;
}

// 包装 /api/exam/* 调用：缺会话时自动获取；遇到 401 自动重试一次。
async function examApi(method, url, body) {
  let sess = await ensureExamSession();
  try {
    return await api(method, url, body, { examSessionToken: sess.token });
  } catch (e) {
    if (e.status === 401) {
      console.warn("[examApi] 收到 401(" + (e.message || "?") + "),清除会话后重试一次");
      clearExamSession();
      sess = await ensureExamSession(true);
      return await api(method, url, body, { examSessionToken: sess.token });
    }
    throw e;
  }
}

// 等待 Cloudflare Turnstile 脚本加载完成（异步加载，可能晚于首屏）。
function waitForTurnstile(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (window.turnstile && typeof window.turnstile.render === "function") return resolve(window.turnstile);
    const start = Date.now();
    const t = setInterval(() => {
      if (window.turnstile && typeof window.turnstile.render === "function") {
        clearInterval(t);
        resolve(window.turnstile);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(t);
        reject(new Error("Turnstile 脚本加载超时，请检查网络或站点是否被拦截"));
      }
    }, 120);
  });
}

// 弹出 Modal 显示 Turnstile 小部件,并在用户通过验证后 resolve 出 token。
// 用户关闭弹窗 / 取消时 resolve 为 null。
async function requestTurnstileToken(action) {
  let ts;
  try {
    ts = await waitForTurnstile();
  } catch (e) {
    await Modal.alert(e.message, { type: "danger" });
    return null;
  }

  const holder = document.createElement("div");
  holder.style.minHeight = "70px";
  holder.style.display = "flex";
  holder.style.justifyContent = "center";
  holder.style.alignItems = "center";

  const wrap = document.createElement("div");
  wrap.appendChild(
    Object.assign(document.createElement("p"), {
      textContent: "请先完成下方人机验证后再提交：",
      style: "margin:0 0 10px;font-size:14px;color:#444",
    })
  );
  wrap.appendChild(holder);

  let widgetId = null;
  let resolveToken;
  const tokenPromise = new Promise((r) => (resolveToken = r));

  try {
    widgetId = ts.render(holder, {
      sitekey: TURNSTILE_SITE_KEY,
      action: action || "exam-submit",
      theme: "auto",
      callback: (token) => resolveToken(token),
      "error-callback": () => resolveToken(null),
      "expired-callback": () => {
        try { ts.reset(widgetId); } catch (_) { }
      },
    });
  } catch (e) {
    await Modal.alert("无法初始化人机验证：" + e.message, { type: "danger" });
    return null;
  }

  // 弹出 Modal,等待用户操作或验证完成
  const modalPromise = Modal.open({
    title: "人机验证",
    body: wrap,
    type: "info",
    buttons: [{ text: "取消", value: null, cancel: true }],
  });

  const token = await Promise.race([tokenPromise, modalPromise]);

  // 清理小部件
  try { if (widgetId !== null) ts.remove(widgetId); } catch (_) { }
  // 若是验证回调先到,则关闭 Modal
  // (Modal.open 没有外部关闭 API,这里通过模拟 ESC 关闭按钮已不可能;
  //  退而求其次:让用户看到"已验证"后手动点击。但 UX 更优做法是自动关闭——
  //  这里用一个小技巧:派发一次 keydown ESC 关闭 modal)
  if (token) {
    try {
      const mask = document.querySelector(".h5m-mask");
      if (mask) mask.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    } catch (_) { }
  }

  return token || null;
}

// ----------------- 视图：首页 -----------------
async function viewHome() {
  render(h("div", { class: "loading" }, "加载课程列表…"));
  const courses = await getCourses();

  const resume = loadSession();

  const modeCards = h("div", { class: "mode-grid" }, [
    h("a", { class: "mode-card", href: "#/course" }, [
      h("h2", {}, "📘 课程小节考试"),
      h("div", { class: "muted" }, "选择某一门课程，使用该课程对应试卷的全部题目"),
    ]),
    h("a", { class: "mode-card", href: "#/mock" }, [
      h("h2", {}, "🧪 模拟考试"),
      h("div", { class: "muted" }, "圈定多门课程，随机抽取 30 / 50 / 100 题组卷"),
    ]),
  ]);

  const stats = h("div", { class: "card" }, [
    h("strong", {}, `共 ${courses.length} 套试卷`),
    " · ",
    h("span", { class: "muted" }, `${courses.reduce((s, c) => s + c.questionCount, 0)} 道题目`),
  ]);

  const children = [stats, modeCards];

  if (resume && Array.isArray(resume.questions) && resume.questions.length) {
    const answered = Object.keys(resume.answers || {}).length;
    children.push(
      h("div", { class: "card", style: "border-left:4px solid #2563eb;" }, [
        h("div", {}, [
          "📌 检测到未提交的考试：",
          h("strong", {}, resume.title || ""),
          " ",
          h("span", { class: "muted" }, `（${answered}/${resume.questions.length} 已作答）`),
        ]),
        h("div", { style: "margin-top:10px;" }, [
          h("button", { class: "btn", onclick: () => location.hash = "#/take" }, "继续作答"),
          " ",
          h("button", { class: "btn ghost", onclick: () => { clearSession(); router(); } }, "清除"),
        ]),
      ])
    );
  }

  render(h("div", {}, children));
}

// ----------------- 视图：选择课程做单课考试 -----------------
async function viewCoursePick() {
  render(h("div", { class: "loading" }, "加载课程列表…"));
  const courses = await getCourses();
  let filter = "";

  const list = h("div", { class: "course-list" });
  function renderList() {
    clear(list);
    const f = filter.trim().toLowerCase();
    const items = courses.filter((c) => !f || (c.title || "").toLowerCase().includes(f));
    if (items.length === 0) {
      list.appendChild(h("div", { class: "empty" }, "无匹配课程"));
      return;
    }
    for (const c of items) {
      const item = h(
        "div",
        {
          class: "course-item",
          onclick: () => startCourseExam(c.courseId),
        },
        [
          h("div", { style: "flex:1" }, [
            h("div", { class: "ttl" }, c.title || `Course #${c.courseId}`),
            h("div", { class: "qc" }, `${c.questionCount} 题 · courseId=${c.courseId} · examId=${c.examId}`),
          ]),
        ]
      );
      list.appendChild(item);
    }
  }

  const search = h("input", {
    class: "search",
    type: "search",
    placeholder: "搜索课程标题…",
    oninput: (e) => { filter = e.target.value; renderList(); },
  });

  renderList();

  render(h("div", {}, [
    h("h2", {}, "选择课程进行考试"),
    h("div", { class: "muted", style: "margin-bottom:12px" }, "点击任一课程开始作答（使用该课程的全部题目）。"),
    search,
    list,
  ]));
}

async function startCourseExam(courseId) {
  render(h("div", { class: "loading" }, "组卷中…"));
  try {
    const exam = await examApi("GET", `/api/exam/course/${courseId}`);
    if (!exam.questions || exam.questions.length === 0) {
      render(h("div", { class: "card empty" }, "该课程没有题目。"));
      return;
    }
    startTake(exam);
  } catch (e) {
    render(h("div", { class: "card empty" }, "加载失败：" + friendlyExamError(e)));
  }
}

// 把后端错误码翻译成用户能看懂的提示
function friendlyExamError(e) {
  const code = (e && (e.message || (e.payload && e.payload.error))) || "";
  switch (code) {
    case "rate_limited": return "请求过于频繁，请稍后再试";
    case "missing_session":
    case "session_invalid":
    case "session_expired":
    case "session_ip_mismatch": return "会话已失效，请重新通过人机验证";
    case "session_quota_exceeded": return "本次会话取卷次数已达上限，请刷新页面重新开始";
    case "session_course_quota_exceeded": return "本次会话已访问过多门课程，请刷新页面重新开始";
    case "session_mock_quota_exceeded": return "本次会话模拟卷次数已达上限，请刷新页面重新开始";
    case "captcha_failed": return "人机验证未通过";
    default: return code || "未知错误";
  }
}

// ----------------- 视图：模拟考试组卷 -----------------
async function viewMockSetup() {
  render(h("div", { class: "loading" }, "加载课程列表…"));
  const courses = await getCourses();
  const selected = new Set();
  let filter = "";
  let count = 30;

  const list = h("div", { class: "course-list" });
  const summary = h("div", { class: "muted", style: "margin:6px 0 12px" });

  function refreshSummary() {
    let qs = 0;
    for (const c of courses) if (selected.has(c.courseId)) qs += c.questionCount;
    summary.textContent = `已选 ${selected.size} 门课程，共 ${qs} 道题可用`;
    startBtn.disabled = selected.size === 0;
  }

  function renderList() {
    clear(list);
    const f = filter.trim().toLowerCase();
    const items = courses.filter((c) => !f || (c.title || "").toLowerCase().includes(f));
    for (const c of items) {
      const cb = h("input", {
        type: "checkbox",
        onclick: (e) => e.stopPropagation(),
        onchange: (e) => {
          if (e.target.checked) selected.add(c.courseId);
          else selected.delete(c.courseId);
          item.classList.toggle("selected", e.target.checked);
          refreshSummary();
        },
      });
      cb.checked = selected.has(c.courseId);
      const item = h(
        "div",
        {
          class: "course-item" + (selected.has(c.courseId) ? " selected" : ""),
          onclick: () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event("change")); },
        },
        [
          cb,
          h("div", { style: "flex:1" }, [
            h("div", { class: "ttl" }, c.title || `Course #${c.courseId}`),
            h("div", { class: "qc" }, `${c.questionCount} 题`),
          ]),
        ]
      );
      list.appendChild(item);
    }
  }

  const search = h("input", {
    class: "search",
    type: "search",
    placeholder: "搜索课程…",
    oninput: (e) => { filter = e.target.value; renderList(); },
  });

  const countSel = h("select", {
    onchange: (e) => { count = Number(e.target.value); },
    style: "padding:8px;border-radius:6px;border:1px solid #d1d5db;",
  }, [
    h("option", { value: "30" }, "30 题"),
    h("option", { value: "50" }, "50 题"),
    h("option", { value: "100" }, "100 题"),
  ]);

  const selectAllBtn = h("button", {
    class: "btn ghost",
    onclick: () => {
      const f = filter.trim().toLowerCase();
      for (const c of courses) {
        if (!f || (c.title || "").toLowerCase().includes(f)) selected.add(c.courseId);
      }
      renderList(); refreshSummary();
    },
  }, "全选(当前结果)");

  const clearBtn = h("button", {
    class: "btn ghost",
    onclick: () => { selected.clear(); renderList(); refreshSummary(); },
  }, "清空");

  // 预设场景：按课程标题前缀（必须带尾随空格）批量选中
  const PRESETS = [
    { label: "ALAT", prefix: "ALAT " },
    { label: "LAT", prefix: "LAT " },
    { label: "LATG", prefix: "LATG " },
  ];

  function applyPreset(prefix, additive) {
    if (!additive) selected.clear();
    let added = 0;
    for (const c of courses) {
      if ((c.title || "").startsWith(prefix)) {
        selected.add(c.courseId);
        added++;
      }
    }
    renderList(); refreshSummary();
    if (added === 0) Modal.alert(`没有标题以 "${prefix}" 开头的课程`, { type: "info" });
  }

  const presetBtns = PRESETS.map((p) =>
    h("button", {
      class: "btn ghost",
      title: `选中所有标题以 "${p.prefix}" 开头的课程（按住 Shift 追加，否则替换当前选择）`,
      onclick: (e) => applyPreset(p.prefix, e.shiftKey),
    }, p.label)
  );

  const startBtn = h("button", {
    class: "btn",
    onclick: async () => {
      startBtn.disabled = true;
      startBtn.textContent = "组卷中…";
      try {
        const exam = await examApi("POST", "/api/exam/mock", {
          courseIds: [...selected],
          count,
        });
        startTake(exam);
      } catch (e) {
        Modal.alert("组卷失败：" + friendlyExamError(e), { type: "danger" });
        startBtn.disabled = false;
        startBtn.textContent = "开始模拟考试";
      }
    },
  }, "开始模拟考试");

  renderList();
  refreshSummary();

  render(h("div", {}, [
    h("h2", {}, "模拟考试 — 配置"),
    h("div", { class: "muted", style: "margin-bottom:12px" }, "勾选纳入抽题的课程，从中随机抽取指定数量题目组成试卷。"),
    h("div", { class: "card" }, [
      h("div", { class: "toolbar" }, [
        h("label", {}, ["题量：", countSel]),
        h("span", { class: "muted", style: "margin-left:8px" }, "快速选择："),
        ...presetBtns,
        h("div", { class: "spacer" }),
        selectAllBtn, clearBtn, startBtn,
      ]),
      summary,
      search,
      list,
    ]),
  ]));
}

// ----------------- 答题 -----------------
function startTake(exam) {
  const session = {
    title: exam.title || "考试",
    mode: exam.mode,
    examId: exam.examId,
    questions: exam.questions,
    answers: {},
    startedAt: Date.now(),
  };
  saveSession(session);
  location.hash = "#/take";
}

function viewTake() {
  const s = loadSession();
  if (!s || !s.questions || s.questions.length === 0) {
    location.hash = "#/";
    return;
  }
  if (!s.marks) s.marks = {};

  const total = s.questions.length;

  const progress = h("div", { class: "q-progress" });
  const list = h("div", {});
  const sidebar = h("aside", { class: "q-sidebar" });

  function isAnswered(qid) {
    const v = s.answers[qid];
    return Array.isArray(v) && v.length > 0;
  }
  function isMarked(qid) { return !!s.marks[qid]; }

  function refreshProgress() {
    const answered = Object.values(s.answers).filter((v) => Array.isArray(v) && v.length > 0).length;
    const marked = Object.values(s.marks).filter(Boolean).length;
    const pct = Math.round((answered / total) * 100);
    clear(progress);
    progress.appendChild(h("div", {}, [
      h("strong", {}, s.title),
      " · ",
      h("span", { class: "muted" }, `${answered} / ${total}`),
      marked ? h("span", { class: "muted", style: "margin-left:8px" }, `· 标记 ${marked}`) : null,
    ]));
    progress.appendChild(h("div", { class: "pbar" }, [h("div", { style: `width:${pct}%` })]));
    progress.appendChild(h("div", {}, [
      h("button", {
        class: "btn ghost", onclick: async () => {
          const ok = await Modal.confirm("确定放弃当前作答并返回首页？所有已作答内容将被清除。", {
            title: "放弃作答",
            type: "danger",
            okText: "放弃",
            cancelText: "继续答题",
          });
          if (ok) { clearSession(); location.hash = "#/"; }
        }
      }, "放弃"),
      " ",
      h("button", { class: "btn", onclick: () => submit() }, "提交批阅"),
    ]));
  }

  function refreshSidebar() {
    clear(sidebar);
    const answered = Object.values(s.answers).filter((v) => Array.isArray(v) && v.length > 0).length;
    const marked = Object.values(s.marks).filter(Boolean).length;

    sidebar.appendChild(h("div", { class: "q-sidebar-head" }, [
      h("strong", {}, "题目导航"),
      h("div", { class: "muted", style: "font-size:12px;margin-top:2px" },
        `${answered}/${total} 已答 · ${marked} 标记`),
    ]));

    const grid = h("div", { class: "q-map" });
    s.questions.forEach((q, idx) => {
      const cls = ["q-cell"];
      if (isAnswered(q.id)) cls.push("answered");
      if (isMarked(q.id)) cls.push("marked");
      grid.appendChild(h("button", {
        class: cls.join(" "),
        title: `跳转到 Q${idx + 1}` + (isMarked(q.id) ? "（已标记）" : ""),
        onclick: () => {
          const el = document.getElementById(`q-${q.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        },
      }, String(idx + 1)));
    });
    sidebar.appendChild(grid);

    sidebar.appendChild(h("div", { class: "q-legend" }, [
      h("div", {}, [h("span", { class: "q-cell-sample" }), "未作答"]),
      h("div", {}, [h("span", { class: "q-cell-sample answered" }), "已作答"]),
      h("div", {}, [h("span", { class: "q-cell-sample marked" }), "已标记"]),
    ]));
  }

  function setAnswer(qid, type, aid, checked) {
    const cur = new Set(s.answers[qid] || []);
    if (type === 1) {
      cur.clear();
      if (checked) cur.add(aid);
    } else {
      if (checked) cur.add(aid); else cur.delete(aid);
    }
    s.answers[qid] = [...cur];
    saveSession(s);
    refreshProgress();
    refreshSidebar();
  }

  function toggleMark(qid, btn) {
    s.marks[qid] = !s.marks[qid];
    saveSession(s);
    btn.classList.toggle("active", s.marks[qid]);
    btn.textContent = s.marks[qid] ? "★ 已标记" : "☆ 标记";
    const card = document.getElementById(`q-${qid}`);
    if (card) card.classList.toggle("marked", s.marks[qid]);
    refreshProgress();
    refreshSidebar();
  }

  s.questions.forEach((q, idx) => {
    const selected = new Set(s.answers[q.id] || []);
    const ul = h("ul", { class: "options" });
    q.answers.forEach((a) => {
      const inputType = q.type === 2 ? "checkbox" : "radio";
      const input = h("input", {
        type: inputType,
        name: `q_${q.id}`,
        value: String(a.id),
        onclick: (e) => e.stopPropagation(),
        onchange: (e) => {
          setAnswer(q.id, q.type, a.id, e.target.checked);
          [...ul.children].forEach((li) => {
            const inp = li.querySelector("input");
            li.classList.toggle("checked", inp && inp.checked);
          });
        },
      });
      if (selected.has(a.id)) input.checked = true;
      const li = h(
        "li",
        {
          class: selected.has(a.id) ? "checked" : "",
          onclick: () => {
            if (q.type === 1) {
              [...ul.querySelectorAll("input")].forEach((i) => (i.checked = false));
              input.checked = true;
            } else {
              input.checked = !input.checked;
            }
            input.dispatchEvent(new Event("change"));
          },
        },
        [input, h("div", { html: a.content || "" })]
      );
      ul.appendChild(li);
    });

    const markBtn = h("button", {
      class: "mark-btn" + (isMarked(q.id) ? " active" : ""),
      onclick: (e) => { e.stopPropagation(); toggleMark(q.id, markBtn); },
      title: "标记此题以便稍后回顾",
    }, isMarked(q.id) ? "★ 已标记" : "☆ 标记");

    list.appendChild(
      h("div", { class: "question" + (isMarked(q.id) ? " marked" : ""), id: `q-${q.id}` }, [
        h("div", { class: "q-head" }, [
          h("div", {}, [
            h("span", { class: "q-num" }, `Q${idx + 1}.`),
            " ",
            h("span", { class: "muted", style: "font-size:12px" }, q.examTitle || ""),
          ]),
          h("div", { style: "display:flex;align-items:center;gap:8px" }, [
            markBtn,
            h("span", { class: "tag" + (q.type === 2 ? " multi" : "") }, q.type === 2 ? "多选" : "单选"),
          ]),
        ]),
        q.title ? h("div", { html: q.title, style: "font-weight:500;margin-bottom:4px" }) : null,
        h("div", { class: "q-content", html: q.content || "" }),
        q.image ? h("img", { src: q.image, alt: "" }) : null,
        ul,
      ])
    );
  });

  async function submit() {
    const answered = Object.values(s.answers).filter((v) => v && v.length).length;
    if (answered < total) {
      // const ok = await Modal.confirm(`还有 ${total - answered} 道未作答，确定提交？`, {
      //   title: "提交确认",
      //   type: "warn",
      //   okText: "确定提交",
      //   cancelText: "再想想",
      // });
      // if (!ok) return;

      Modal.alert(`还有 ${total - answered} 道未作答，请完成所有题目后再提交。`, { type: "info" });
      return;
    }

    // 提交前先做 Cloudflare Turnstile 人机验证
    const cfToken = await requestTurnstileToken("exam-submit");
    if (!cfToken) {
      await Modal.alert("人机验证未通过,已取消提交。", { type: "warn" });
      return;
    }

    render(h("div", { class: "loading" }, "批阅中…"));
    try {
      const result = await api("POST", "/api/exam/grade", {
        answers: s.answers,
        cfTurnstileResponse: cfToken,
      });
      clearSession();
      sessionStorage.setItem(
        "aalas_exam_last_result",
        JSON.stringify({
          title: s.title,
          mode: s.mode,
          questions: s.questions,
          submitted: s.answers,
          result,
        })
      );
      location.hash = "#/result";
    } catch (e) {
      await Modal.alert("提交失败：" + e.message, { type: "danger" });
      router();
    }
  }

  refreshProgress();
  refreshSidebar();
  render(h("div", { class: "take-layout" }, [
    h("div", { class: "take-main" }, [progress, list]),
    sidebar,
  ]));
}

// ----------------- 结果 -----------------
function viewResult() {
  let data;
  try {
    data = JSON.parse(sessionStorage.getItem("aalas_exam_last_result") || "null");
  } catch (_) { data = null; }
  if (!data) { location.hash = "#/"; return; }

  const { result, questions, submitted } = data;
  const passed = result.score >= 60;

  const summary = h("div", { class: "result-summary" }, [
    h("div", { class: "muted" }, data.title),
    h("div", { class: "score" + (passed ? "" : " bad") }, `${result.score}`),
    h("div", { class: "meta" }, `答对 ${result.correct} / ${result.total}，错 ${result.wrongCount} 题`),
    h("div", { style: "margin-top:14px" }, [
      h("button", { class: "btn ghost", onclick: () => location.hash = "#/" }, "返回首页"),
    ]),
  ]);

  const wrongById = new Map(result.wrong.map((w) => [w.id, w]));

  const blocks = [];
  if (result.wrongCount > 0) {
    blocks.push(h("div", { class: "card" }, [
      h("strong", {}, "错题回顾"),
      " ",
      h("span", { class: "legend" }, [h("span", { class: "dot correct" }), "正确答案"]),
      h("span", { class: "legend" }, [h("span", { class: "dot wrong" }), "你的错误选择"]),
    ]));
    questions.forEach((q, idx) => {
      const w = wrongById.get(q.id);
      if (!w) return;
      const correctSet = new Set(w.correct);
      const yourSet = new Set(w.your);
      const ul = h("ul", { class: "options" });
      q.answers.forEach((a) => {
        const isCorrect = correctSet.has(a.id);
        const isYours = yourSet.has(a.id);
        let cls = "";
        if (isCorrect) cls = "correct";
        else if (isYours) cls = "wrong";
        ul.appendChild(h("li", { class: cls }, [
          h("span", {}, isCorrect ? "✔ " : isYours ? "✘ " : "  "),
          h("div", { html: a.content || "" }),
        ]));
      });
      blocks.push(h("div", { class: "question" }, [
        h("div", { class: "q-head" }, [
          h("div", {}, [h("span", { class: "q-num" }, `Q${idx + 1}.`), " ", h("span", { class: "muted", style: "font-size:12px" }, q.examTitle || "")]),
          h("span", { class: "tag" + (q.type === 2 ? " multi" : "") }, q.type === 2 ? "多选" : "单选"),
        ]),
        q.title ? h("div", { html: q.title, style: "font-weight:500" }) : null,
        h("div", { class: "q-content", html: q.content || "" }),
        ul,
      ]));
    });
  } else {
    blocks.push(h("div", { class: "card empty" }, "🎉 全部答对！"));
  }

  render(h("div", {}, [summary, ...blocks]));
}

// ----------------- 路由 -----------------
function router() {
  const hash = location.hash || "#/";
  if (hash === "#/" || hash === "") return viewHome();
  if (hash === "#/course") return viewCoursePick();
  if (hash === "#/mock") return viewMockSetup();
  if (hash === "#/take") return viewTake();
  if (hash === "#/result") return viewResult();
  viewHome();
}

window.addEventListener("hashchange", router);
window.addEventListener("error", (e) => console.error(e));
router();
