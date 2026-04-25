# 静态化方案：Service Worker 拦截 + 纯前端部署

> 目标：彻底拿掉 Node mock 服务器（`server.js`），把整个站点变成纯静态资源，
> 可以直接托管到 GitHub Pages / Cloudflare Pages / Netlify / 任意静态空间。
>
> 核心思路：用 **Service Worker** 在浏览器内拦截所有 `/api/*` 和 `/token`
> 请求，按原 mock 服务器的同款规则把请求映射到 `/mock_data/...` 下的静态 JSON。

---

## 1. 总体结构

```
dist_static/                    ← 部署根
├── index.html                  ← 重定向到 /app/dashboard.html
├── 404.html                    ← = dashboard.html，GitHub Pages SPA 兜底
├── _redirects                  ← Cloudflare Pages / Netlify 兜底
├── sw.js                       ← Service Worker（拦截 /api/*、/token）
├── app/                        ← 原 public/app
├── login/                      ← 原 public/login
├── assets/  bower_components/  Images/  exam/
└── mock_data/                  ← 原 mock_data/，新增 _index/courses.json
    ├── _index/courses.json     ← 课程搜索索引（构建期生成）
    └── api/...
```

**前端代码 0 改动**。`serviceBase = '/'` 不变，`$http.get('/api/Course/123')`
仍然发同样的请求，只是被 SW 改写到 `/mock_data/api/Course/123.json`。

---

## 2. 新增/改动的文件

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `public/sw.js` | 新增 | Service Worker 主体（含轻量 md5 实现） |
| `public/index.html` | 新增 | 根路径重定向到 dashboard |
| `public/app/dashboard.html` | 改动 | `<base>` 后注入 SW 注册 + sessionStorage 鉴权种子 |
| `public/login/signin.html` | 改动 | 同上 |
| `scripts/build_search_index.js` | 新增 | 扫描 `mock_data/api/Course/*.json` → `mock_data/_index/courses.json` |
| `scripts/build_static_site.js` | 新增 | 把 `public/` + `mock_data/` 拷到 `dist_static/`，附加 `_redirects` 和 `404.html` |
| `package.json` | 改动 | 增加 `build:search-index` 与 `build:static` 脚本 |

---

## 3. SW 路由对照表

与 `server.js` 行为一一对齐。

| 请求 | SW 处理 |
| --- | --- |
| `GET /api/Foo/123` | 取 `/mock_data/api/Foo/123.json`，404 → `[]` |
| `GET /api/Foo?bar=1` | 先试 `/mock_data/api/Foo__q_<md5(?bar=1)[:8]>.json`，再试无 query 版本 |
| `POST /api/Foo/123` | 先试 `/mock_data/api/Foo/123.POST.json`，未命中走兜底 |
| `POST /token` | 合成 mock token（任意账号密码登录成功） |
| `GET /api/ClientToken` | 合成 `{token: 'mock-token-aalas-offline'}` |
| `GET /api/SearchTitle/:q` | 加载 `/mock_data/_index/courses.json`，客户端 `title.includes(q)` |
| `POST /api/Page/:id` | 合成 `{hasExam: true, status: 'active'}` |
| `POST /api/Exam/SaveAnswer/...`、`SaveMultipleAnswer/...` | 200 空响应 |
| `POST /api/Exam/ScoreExam` | 回 `body.id`（与原 mock 一致） |
| `POST/PUT/DELETE /api/author/**` 等其他写操作 | 200 `{ok:true,mock:true}`（**不会真正持久化**） |

响应头加 `X-Mock-By: sw` / `sw-file` / `sw-empty` 便于排查。

---

## 4. 构建与部署

### 4.1 构建

```bash
bun install
bun run build:search-index    # 生成 mock_data/_index/courses.json
bun run build:static          # 产出 dist_static/
```

体积约 55MB（其中 mock_data 52MB）。

### 4.2 本地预览

```bash
cd dist_static
bunx serve -s .               # -s 启用 SPA fallback（重要！）
# 或：bunx http-server -P http://localhost:8080?
# 浏览器打开 http://localhost:8080
```

> **必须通过 http(s):// 访问，不能 file:// 双击**——浏览器禁止 file 协议下注册 SW。
>
> **`python3 -m http.server` 不支持 SPA fallback**，深链首次访问会 404。
> 用 `serve -s` 或任意带 SPA fallback 的静态服务器。SW 装好后即便没 fallback 也能兜底。

### 4.3 GitHub Pages

1. 新建仓库（或使用 `gh-pages` 分支），把 `dist_static/*` 推上去
2. 仓库 Settings → Pages → Source 选目标分支
3. **重要**：404 兜底已通过 `404.html = dashboard.html` 处理，深链可用
4. 注意：GitHub Pages 的 SW scope 限制——`/sw.js` 默认 scope `/`，
   如果你部署在子路径（如 `username.github.io/repo/`），把 `sw.js` 留在子路径
   根并将注册路径改成相对路径 `register('sw.js')`

### 4.4 Cloudflare Pages / Netlify

1. 直接拖 `dist_static/` 上传，或连 Git 仓库
2. 构建命令：`bun run build:search-index && bun run build:static`
3. 输出目录：`dist_static`
4. `_redirects` 文件已生成，深链自动 fallback 到 `dashboard.html`

---

## 5. 已知限制与注意事项

### 5.1 必须 https/localhost
SW 依赖安全上下文。本地 `http://localhost` 是允许的，部署上线需要 HTTPS
（GitHub Pages / CF Pages 默认就是）。

### 5.2 Authoring 功能不可用
`/api/author/**` 的所有写操作（POST/PUT/DELETE）只会被 SW 应付为 200，
**不会真的修改 mock_data**。如果用户走到 authoring 编辑页保存，刷新后丢失。
建议在前端隐藏 authoring 入口，或在 README 里提示。

### 5.3 课程搜索是「构建快照」
`/api/SearchTitle/:q` 现在基于构建期生成的 `_index/courses.json`，
新增/删除 mock 课程后需要重跑 `bun run build:search-index` 再部署。

### 5.4 首次加载的 race condition
SW 在首次注册时还未控制页面，前几个 `/api/*` 请求可能直接打到服务器
（静态主机会 404）。处理方式：注入脚本中监听 `controllerchange` 自动 reload
一次，AngularJS 启动后所有后续请求都会被拦截。已在 dashboard.html / signin.html
里实现。

### 5.5 缓存策略
SW 用 `cache: 'force-cache'` 复用浏览器 HTTP 缓存。要强制更新数据：
- 修改 `sw.js` 顶部 `SW_VERSION` 常量并重新部署
- 或用户在 DevTools → Application → Service Workers → Update / Unregister

### 5.7 媒体资源走 CDN
SW 会把同源的图片/音视频请求 **302 重定向**到 `https://static.aalas.net`，
路径保持不变。命中规则：

- 扩展名：`jpg/jpeg/png/gif/webp/bmp/svg/ico/avif/mp3/wav/ogg/m4a/flac/aac/mp4/m4v/webm/mov/ogv`
- 豁免前缀（不走 CDN）：`/mock_data/`、`/api/`、`/sw.js`、`/bower_components/`、`/assets/`

调整办法：直接改 `public/sw.js` 顶部的 `MEDIA_CDN` / `MEDIA_EXT_RE` /
`MEDIA_EXEMPT_PREFIXES`，并把 `SW_VERSION` 递增以触发更新。

注意：
- CDN 必须支持 HTTPS 与 **Range 请求**（`<video>` 拖动进度条会发 Range）
- 用 302 重定向而非 SW 内 `fetch(cdn)`，避免把 CORS / opaque response /
  range 处理负担压到 SW 上，浏览器原生处理最稳
- 跨域响应若被 `<img crossorigin>` 或 canvas 使用，CDN 需返回 `Access-Control-Allow-Origin`
- 设 `MEDIA_CDN = ''` 即可关闭重定向，回退到本地 `Images/` 等目录

---


## 6. 验证清单

部署后逐项确认：

- [ ] 打开站点根 → 自动跳转 `/app/dashboard.html`
- [ ] DevTools → Application → Service Workers 看到 `sw.js` 已 activated
- [ ] DevTools → Network 中 `/api/Course/<id>` 显示 `(ServiceWorker)` 来源，
      响应头有 `X-Mock-By: sw-file`
- [ ] `/api/SearchTitle/medication` 能返回非空数组
- [ ] 任意账号密码登录 `/login/signin.html` 后能进 dashboard
- [ ] 直接访问深链 `/app/library/course/151` 不 404，能渲染课程
- [ ] 清空 sessionStorage + 强制刷新 → SW 重新注册并拦截

---

## 7. 回退到 Node 服务器

`server.js` 没有删除，仍可以 `bun run server.js` 起本地服务（如开发调试 mock_data）。
两套方案并存，互不冲突。

---

## 8. 与 PACK.md 的关系

- `PACK.md`：把 `server.js` 编译成单文件可执行（仍是 Node/Bun 进程）
- `STATIC.md`（本文档）：彻底去掉服务进程，纯静态资源 + SW

二者**互斥**：选一种发布方式即可。一般来说：
- 想给非技术用户**双击/命令行运行**的桌面级体验 → PACK.md
- 想丢到任意静态托管、零运维、可被全网访问 → STATIC.md（推荐）
