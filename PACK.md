# 打包方案：用 Bun 把 `server.js` 编译为单文件本地应用（外挂资源）

> 目标：把 `server.js`（AALAS 离线 Mock 站点）编译为单个原生可执行文件，
> 资源目录 `public/`、`mock_data/` 与可执行文件**同目录外挂**，双击即可启动。
> 考试服务 `exam_server.js` **不在本次打包范围内**。

---

## 1. 可行性评估

### 1.1 依赖盘点

`server.js` 实际运行时依赖：

| 依赖 | 类型 | 是否兼容 `bun build --compile` |
| --- | --- | --- |
| `express@^5` | npm | ✅ 纯 JS，bun 已验证可用 |
| `path` / `fs` / `crypto` | Node 内置 | ✅ bun 原生支持 |
| `playwright` / `cheerio` / `fs-extra` | npm | ⚠️ 仅抓站脚本使用，**入口 `server.js` 不引用**，不会被打进二进制 |

结论：**无原生模块、无动态 require、无 worker**，编译路径干净。

### 1.2 资源体积

```
public/      3.1 MB   （AngularJS SPA + bower_components + Images）
mock_data/   52 MB    （API JSON 快照，文件数较多）
```

外挂方案下二者只随发布包一起 zip 即可，**不会膨胀单文件二进制**。
若改成嵌入（`with { type: 'file' }`），52MB 的 mock_data 会让二进制接近 60MB
且增加冷启动时间，没必要。

### 1.3 路径基准的关键陷阱 ⚠️

`bun build --compile` 后：

- `__dirname` / `__filename` → 指向虚拟根 `/$bunfs/root/...`
- `process.execPath` → 指向**真实的可执行文件路径**

`server.js` 现在所有资源路径都基于 `__dirname`，**直接编译会找不到 `public/` 和 `mock_data/`**。
必须在入口里把基准换成 `path.dirname(process.execPath)`，或允许 env 覆盖。

### 1.4 其他需要注意的点

- `buildMemoryCourseIndex()` 在启动时同步遍历 `mock_data/api/Course`，目录缺失会直接抛错。
  → 包装一层 try/catch 给出明确提示。
- `app.listen(PORT, "0.0.0.0", …)` 在 Windows 首次启动会触发防火墙弹窗，属正常行为。
- `IMG_CDN` 走环境变量，发布时建议附带 `.env` 模板或 README 说明。
- `express@5` 的路径正则 `/^\/app(\/.*)?$/` 在 bun runtime 下已验证可用。
- 单文件二进制在 macOS 上没签名，首次运行会被 Gatekeeper 拦截 → 用户需要
  右键“打开”一次或执行 `xattr -d com.apple.quarantine ./aalas-app`。

### 1.5 结论

**完全可行。** 改动量很小：新增一个入口包装文件（或直接在 `server.js` 顶部
改 5 行路径解析），加 1 条 build 脚本即可。

---

## 2. 改造步骤

### 2.1 新增 `pack-entry.js`（推荐，保持 `server.js` 不动）

在仓库根目录新建 `pack-entry.js`：

```js
// pack-entry.js —— bun --compile 入口
'use strict';

const path = require('path');
const fs   = require('fs');

// 编译后 __dirname 指向 /$bunfs/root，必须改用 execPath
const isCompiled = process.execPath && !/[\\/]bun(\.exe)?$/i.test(process.execPath);
const BASE_DIR = isCompiled
  ? path.dirname(process.execPath)
  : __dirname;

// 允许用户用环境变量覆盖
process.env.PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(BASE_DIR, 'public');
process.env.MOCK_DIR   = process.env.MOCK_DIR   || path.join(BASE_DIR, 'mock_data');

// 资源缺失时给出明确提示，避免栈跟踪噪音
for (const [name, dir] of [['public', process.env.PUBLIC_DIR], ['mock_data', process.env.MOCK_DIR]]) {
  if (!fs.existsSync(dir)) {
    console.error(`\n[FATAL] 找不到资源目录「${name}」: ${dir}`);
    console.error(`        请把 ${name}/ 与可执行文件放在同一目录，或设置环境变量 ${name === 'public' ? 'PUBLIC_DIR' : 'MOCK_DIR'} 指向正确路径。\n`);
    process.exit(1);
  }
}

require('./server.js');

// 可选：自动开浏览器
if (process.env.OPEN !== '0') {
  const url = `http://localhost:${process.env.PORT || 3000}`;
  const cmd = process.platform === 'darwin' ? 'open'
            : process.platform === 'win32'  ? 'start'
            : 'xdg-open';
  try {
    require('child_process').spawn(cmd, [url], {
      shell: true, detached: true, stdio: 'ignore',
    }).unref();
  } catch (_) { /* ignore */ }
}
```

### 2.2 修改 `server.js`：让路径可被 env 覆盖

只改两行（保持向后兼容）：

```js
// 修改前
const PUBLIC_DIR = path.join(__dirname, 'public');
const MOCK_DIR   = path.join(__dirname, 'mock_data');

// 修改后
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, 'public');
const MOCK_DIR   = process.env.MOCK_DIR   || path.join(__dirname, 'mock_data');
```

> `bun run server.js` 下行为不变；`pack-entry.js` 通过 env 注入新基准。

### 2.3 给 `buildMemoryCourseIndex` 加防御（可选，但推荐）

```js
function buildMemoryCourseIndex() {
  const dir = path.join(MOCK_DIR, 'api', 'Course');
  if (!fs.existsSync(dir)) {
    console.warn(`[WARN] 课程索引目录不存在，跳过: ${dir}`);
    return;
  }
  // ……保持原逻辑
}
```

---

## 3. 编译命令

在 `package.json` 里加：

```json
{
  "scripts": {
    "pack:mac-arm":  "bun build ./pack-entry.js --compile --target=bun-darwin-arm64 --outfile dist/aalas-app",
    "pack:mac-x64":  "bun build ./pack-entry.js --compile --target=bun-darwin-x64  --outfile dist/aalas-app-x64",
    "pack:win":      "bun build ./pack-entry.js --compile --target=bun-windows-x64 --outfile dist/aalas-app.exe",
    "pack:linux":    "bun build ./pack-entry.js --compile --target=bun-linux-x64   --outfile dist/aalas-app-linux",
    "pack:dist":     "bun run pack:mac-arm && cp -R public mock_data dist/"
  }
}
```

执行：

```bash
bun install                 # 确保 express 等依赖已装
bun run pack:mac-arm        # 产出 dist/aalas-app（~90MB，含 bun runtime）
bun run pack:dist           # 一并把 public/ mock_data/ 复制到 dist/
```

> 跨平台编译不需要对应平台的机器，`bun build --compile --target=…` 会下载对应 runtime。

---

## 4. 发布包结构

```
aalas-app-v1.0/
├── aalas-app           ← 可执行文件（macOS / Linux）
├── aalas-app.exe       ← 可执行文件（Windows，二选一）
├── public/             ← 原样复制
├── mock_data/          ← 原样复制
└── README.txt          ← 用户文档（启动方式、端口、CDN 配置）
```

打包压缩：

```bash
cd dist && zip -r aalas-app-mac-arm64.zip aalas-app public mock_data
```

---

## 5. 用户使用说明（写进 README.txt）

```
1. 解压本压缩包到任意目录（路径不要含中文/空格更稳）。
2. 双击 aalas-app（Windows 双击 aalas-app.exe）。
   首次运行 macOS 可能提示「无法验证开发者」：
     右键文件 → 打开 → 打开
   或终端执行：
     xattr -d com.apple.quarantine ./aalas-app
3. 浏览器会自动打开 http://localhost:3000
4. 默认端口 3000，可通过环境变量修改：
     PORT=8080 ./aalas-app
5. 关闭程序：终端 Ctrl+C，或关闭命令行窗口。
```

---

## 6. 验证清单（发布前必跑）

- [ ] `bun run server.js` 本地能跑，登录页与 dashboard 可访问
- [ ] `bun run pack:mac-arm` 编译成功，无 warning
- [ ] `cd dist && ./aalas-app` 启动后：
  - [ ] 控制台打印 `Mock 服务已启动: http://localhost:3000`
  - [ ] 浏览器自动打开
  - [ ] `/app/dashboard.html` 能渲染
  - [ ] `/api/Course/<已知 id>` 返回 JSON（X-Mock-File 头存在）
  - [ ] `/api/SearchTitle/<关键词>` 返回数组（验证内存索引已构建）
- [ ] 把 `public/` 改名后启动 → 能看到清晰的 FATAL 报错
- [ ] `PORT=8080 ./aalas-app` 能改端口
- [ ] `IMG_CDN=https://example.com ./aalas-app` 启动日志能看到 CDN 行

---

## 7. 常见问题

**Q: 二进制能不能再小一点？**
A: bun runtime 本身约 90MB，是固定开销。如要更小考虑改用 `pkg`/`nexe`（基于 Node），
但会失去 bun 的启动速度和 ESM 兼容优势。

**Q: 能否把 `public/` 也嵌进去？**
A: 可以用 `--asset` 或 `with { type: 'file' }`，但需要遍历几百个文件 import，
编译时间和二进制尺寸都明显上升，且 `express.static` 需要改写为「启动时落盘到 tmp 目录」。
当前外挂方案性价比最高。

**Q: 用户机器没装 bun 能跑吗？**
A: 可以。`--compile` 把 bun runtime 静态链接进二进制，目标机不需要任何依赖。

**Q: Windows 杀软误报怎么办？**
A: 用 `signtool` 做代码签名；或在 README 中提示用户加白名单。
