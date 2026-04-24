# 部署指南（Cloudflare + Ubuntu）

本指南把项目部署成下面这种拓扑：

```
                 ┌─────────────────────────────┐
   用户浏览器 ──▶│ Cloudflare 边缘 (橙云代理)   │
                 │  · DNS / TLS / WAF           │
                 │  · Cache Rules 缓存 html/js/css │
                 └──────────────┬──────────────┘
                                │ 回源
                                ▼
   ┌────────────────────────────────────────────┐
   │ Ubuntu 服务器                              │
   │   Nginx (80/443) ──▶ PM2                   │
   │     ├─ aalas-web   :3000  (server.js)      │
   │     └─ aalas-exam  :3001  (exam_server.js) │
   └────────────────────────────────────────────┘

   静态图片资源
   public/Images  ──▶  Cloudflare R2 (cdn.example.com)
   server.js 里 /Images/* 通过 IMG_CDN 环境变量 301 到 R2
```

- **页面资源 (html/js/css)**：仍由 Ubuntu 的 `server.js` 提供，Cloudflare 通过 Cache Rules 在边缘缓存，效果接近 Pages（详见 §5）。
- **图片资源**：上传到 Cloudflare R2，`server.js` 用 `IMG_CDN` 环境变量做 301 重定向（已内置）。
- **后端 API / 鉴权**：保持同源根路径 `/api/*`、`/token`，无需改前端代码。

---

## 0. 准备清单

- 已在 Cloudflare 托管的域名（示例：`example.com`）
- 一台 Ubuntu 22.04+ 服务器，公网 IP；已开放 22/80/443
- 本地或服务器有 Node 20+
- 项目 `mock_data/`、`exam.db`（或其构建源数据）已就绪

子域规划（按需调整）：

| 子域 | 用途 |
|------|------|
| `example.com` / `www.example.com` | 主站 (`server.js` :3000) |
| `exam.example.com` | 题库站 (`exam_server.js` :3001) |
| `cdn.example.com` | 静态图片 (R2) |

---

## 1. 把 `public/Images` 托管到 Cloudflare R2

`public/Images` 约 4700 个文件 / ~300 MB，用 **R2** 最合适（S3 兼容、出口免费、可绑自定义域名直读）。

### 1.1 创建 Bucket 与公开域名

1. Cloudflare 控制台 → **R2** → **Create bucket**，名称如 `aalas-images`。
2. Bucket → **Settings → Public access → Connect Domain**，绑定 `cdn.example.com`。Cloudflare 会自动写入一条 Proxied 的 CNAME。
3. （可选）**CORS Policy**，仅在浏览器需要跨域读图时配置：
   ```json
   [
     {
       "AllowedOrigins": ["https://example.com", "https://www.example.com"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### 1.2 上传图片（rclone）

在本机或服务器执行：

```bash
# 1. 安装 rclone
curl https://rclone.org/install.sh | sudo bash

# 2. Cloudflare 控制台 → R2 → Manage R2 API Tokens → 创建 Access Key/Secret
# 3. 配置 remote
rclone config
#   name: r2
#   storage: s3
#   provider: Cloudflare
#   access_key_id / secret_access_key: 上一步生成
#   endpoint: https://<accountid>.r2.cloudflarestorage.com
#   region: auto

# 4. 同步（保留目录结构）
rclone copy ./public/Images r2:aalas-images/Images \
  --transfers=32 --checkers=32 --fast-list --progress
```

验证：浏览器访问 `https://cdn.example.com/Images/<任一文件>` 应能直接出图。

### 1.3 启用 server.js 的 CDN 重定向

`server.js` 已内置以下逻辑（无需改代码）：

```js
const IMG_CDN = (process.env.IMG_CDN || '').replace(/\/+$/, '');
if (IMG_CDN) {
  app.get(/^\/Images\/.+/i, (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400');
    res.redirect(301, IMG_CDN + req.path);
  });
}
```

启动时设置 `IMG_CDN=https://cdn.example.com` 即可。留空则继续从本地 `public/Images` 出图，方便本地开发。

---

## 2. Ubuntu 服务器初始化

本工程已切到 **Bun 1.x** 运行时，SQLite 由 Bun 内置的 `bun:sqlite` 提供，**无需 `build-essential`、无需原生编译**。

```bash
sudo apt update
sudo apt install -y curl git nginx ufw unzip

# 安装 Bun（系统级，方便 PM2 / systemd 找到）
curl -fsSL https://bun.sh/install | bash
sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
bun --version          # 应输出 1.x

# PM2 用于守护两个进程；PM2 本身仍需要 Node，最小化安装即可
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

> 也可以用 Bun 自带的 `bun pm` 守护进程，但 PM2 生态成熟、日志切割方便，这里仍用 PM2 + `interpreter: "bun"` 方案。

---

## 3. 拉代码并启动两个进程

```bash
sudo mkdir -p /opt && cd /opt
sudo git clone https://github.com/lovespite/aalas-fake-website.git
sudo chown -R $USER:$USER aalas-fake-website
cd aalas-fake-website

bun install --production

# 题库 db 如未生成
bun run exam:build
```

### 3.1 PM2 配置

新建 `ecosystem.config.js`：

```js
module.exports = {
  apps: [
    {
      name: 'aalas-web',
      script: 'server.js',
      interpreter: 'bun',           // 关键：用 Bun 跑
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        IMG_CDN: 'https://cdn.example.com'
      }
    },
    {
      name: 'aalas-exam',
      script: 'exam_server.js',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        EXAM_PORT: 3001
      }
    }
  ]
};
```

启动 + 开机自启：

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # 按提示复制粘贴执行返回的那行 sudo 命令
pm2 status
```

> 若 PM2 报错找不到 `bun`，把 `interpreter` 改成绝对路径 `/usr/local/bin/bun`（或 `/home/<user>/.bun/bin/bun`）。

---

## 4. Nginx 反向代理 + HTTPS

### 4.1 站点配置

`/etc/nginx/sites-available/aalas`：

```nginx
# ===== 主站 =====
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate     /etc/ssl/cf/example.com.pem;
    ssl_certificate_key /etc/ssl/cf/example.com.key;

    client_max_body_size 50m;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}

# ===== 题库站 =====
server {
    listen 80;
    server_name exam.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exam.example.com;

    ssl_certificate     /etc/ssl/cf/example.com.pem;
    ssl_certificate_key /etc/ssl/cf/example.com.key;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### 4.2 Cloudflare 源站证书

Cloudflare 控制台 → **SSL/TLS → Origin Server → Create Certificate**，域名填 `example.com, *.example.com`，下载得到 cert/key：

```bash
sudo mkdir -p /etc/ssl/cf
sudo nano /etc/ssl/cf/example.com.pem   # 粘贴 Origin Certificate
sudo nano /etc/ssl/cf/example.com.key   # 粘贴 Private Key
sudo chmod 600 /etc/ssl/cf/*
```

启用：

```bash
sudo ln -sf /etc/nginx/sites-available/aalas /etc/nginx/sites-enabled/aalas
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Cloudflare 配置（DNS / TLS / Cache）

### 5.1 DNS Records

| Type  | Name | Content        | Proxy        |
|-------|------|----------------|--------------|
| A     | `@`    | 服务器公网 IP    | 🟧 Proxied  |
| A     | `www`  | 服务器公网 IP    | 🟧 Proxied  |
| A     | `exam` | 服务器公网 IP    | 🟧 Proxied  |
| CNAME | `cdn`  | （R2 自动创建）  | 🟧 Proxied  |

### 5.2 SSL/TLS

- **SSL/TLS → Overview**：选 **Full (strict)**。
- **Edge Certificates**：开启 **Always Use HTTPS** 与 **Automatic HTTPS Rewrites**。
- **Min TLS Version**：建议 TLS 1.2。

### 5.3 Cache Rules（让 html/js/css 真正吃到边缘缓存）

Cloudflare 对带 cookie 的 HTML 默认是 BYPASS。AngularJS 这类 SPA 的入口 HTML 几乎不变，可以放心缓存。

控制台 → **Caching → Cache Rules → Create rule**：

#### 规则 1：缓存静态资源（JS/CSS/字体/HTML 等）

- **When incoming requests match**：
  ```
  (http.request.uri.path.extension in {"js" "css" "html" "htm" "woff" "woff2" "ttf" "svg" "ico" "map"})
  and (http.host in {"example.com" "www.example.com"})
  ```
- **Then**：
  - Cache eligibility：**Eligible for cache**
  - Edge TTL：**Override** → `2 hours`（HTML 变更频繁可设 5–10 分钟）
  - Browser TTL：**Override** → `30 minutes`
  - Cache Key：忽略 cookie / query 中无关字段（默认即可）

#### 规则 2：API/鉴权一律不缓存

- **When**：
  ```
  (starts_with(http.request.uri.path, "/api/")) or
  (http.request.uri.path eq "/token")
  ```
- **Then**：Cache eligibility = **Bypass cache**。

> 发版后想立刻生效：**Caching → Configuration → Purge Everything**，或在 Cache Rules 里临时把 TTL 降为 30s。

### 5.4 验证

```bash
# 应能看到 cf-cache-status: HIT (二次访问)
curl -I https://example.com/assets/js/app.js
curl -I https://cdn.example.com/Images/<某图片>

# API 应是 BYPASS / DYNAMIC
curl -I https://example.com/api/Course/SearchCourses
```

浏览器 DevTools → Network：

- `cf-cache-status: HIT` → 边缘命中
- `cf-cache-status: MISS` → 已写入缓存，下次 HIT
- `cf-cache-status: DYNAMIC` → 命中 Bypass 规则（API 应该是这个）

---

## 6. 日常运维

```bash
# 查看进程
pm2 status
pm2 logs aalas-web --lines 200
pm2 logs aalas-exam --lines 200

# 重启
pm2 restart aalas-web

# 更新代码
cd /opt/aalas-fake-website
git pull
bun install --production
pm2 restart all
```

发布静态资源更新后，记得在 Cloudflare 做一次 **Purge Cache**（按 URL 或全量）。

---

## 7. 常见问题

| 现象 | 排查 |
|------|------|
| 登录后 401 / 接口 404 | 确认 Cache Rules 里 `/api/*`、`/token` 是 Bypass；Nginx `proxy_pass` 指向 3000 |
| HTML 改了但浏览器还是旧的 | Cloudflare Purge + 浏览器硬刷新 (Ctrl+F5) |
| 图片 404 | R2 公开域名没绑、未开 Public access、或 `Images/` 目录大小写不一致（Linux/R2 区分大小写） |
| 题库页面打不开 | `pm2 logs aalas-exam` 看 `exam.db` 是否存在；未生成需 `bun run exam:build` |
| 上传 / 大请求 413 | 调整 Nginx `client_max_body_size` 与 Cloudflare 计划上传上限（Free 100MB） |
| `pm2 start` 报 `bun: not found` | 把 `ecosystem.config.js` 里的 `interpreter` 写成绝对路径，例如 `/usr/local/bin/bun`；并确认 `which bun` 可用 |

---

## 附录 A：把静态资源部署到 Cloudflare Pages（进阶）

如果希望 html/js/css 真正由 Pages 全球分发，而不是回源缓存：

1. **拆出静态构建**：把 `public/` 作为 Pages 项目的 output 目录。
2. **API 反代**：Pages 项目里加 `functions/api/[[path]].js`：
   ```js
   export async function onRequest({ request }) {
     const url = new URL(request.url);
     url.hostname = 'origin.example.com'; // 指向 Ubuntu（建一个不走 CF 代理的灰云子域）
     return fetch(new Request(url, request));
   }
   ```
   同理写一个 `functions/token.js` 处理 `/token`。
3. **Images** 仍走 R2 / `cdn.example.com`。

代价：

- 需要新增一个 **未代理（灰云）** 的 `origin.example.com` 让 Pages Functions 回源。
- AngularJS 的 Bearer Token 通过 Functions 透传，需要确保 `Authorization` header 不被剥离（默认不会）。
- 调试链路变长，回滚不如方案 A 干脆。

如无明确性能瓶颈，**优先使用本指南正文的方案 A**。
