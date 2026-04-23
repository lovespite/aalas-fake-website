# **Angular 站点本地化 Mock 还原工程**

## **🎯 项目目的 (Project Purpose)**

本项目旨在将一个需要动态身份认证的 **AngularJS (1.x) 单页应用 (SPA)** 完整克隆至本地，实现真正的**完全离线访问**。

由于目标网站是典型的 SPA 架构（数据由后端 API 动态提供，路由由前端接管），传统的静态网页扒站工具（如 HTTrack）无法保留其动态交互和导航逻辑。

因此，本项目采用\*\*“无损前端剥离 \+ 后端 API Mock 替换”\*\*的策略：

1. 原封不动地保留 AngularJS 前端代码、UI 组件和路由树。  
2. 通过无头浏览器（Playwright）在已登录状态下拦截并保存真实 API 响应的 JSON 数据。  
3. 在本地使用 Express.js 搭建轻量级 Mock 服务器，接管前端的数据请求，完美“欺骗”前端，使其在脱机状态下正常运行。

最终产物是一个可直接在本地运行、拥有完整原生交互体验的离线知识库/内容站点。

## **📂 目录结构 (Directory Structure)**

.  
├── public/                 \# (阶段一产物) 存放前端静态资源 (HTML, CSS, JS, bower\_components等)  
├── mock\_data/              \# (阶段二产物) 存放拦截下来的后端 API 数据 (JSON格式)  
├── download\_assets.js      \# 静态资源自动化抓取脚本  
├── fetch\_api\_data.js       \# (TODO) 动态 API 数据拦截爬取脚本  
├── server.js               \# (TODO) 本地 Express Mock 服务器代码  
├── package.json            \# Node.js 依赖配置  
└── README.md               \# 项目说明文档

## **🚀 三阶段开发计划 (TODO List)**

### **阶段一：前端静态环境剥离 (已完成)**

**目标：** 获取 Angular 运行所需的所有基础结构和视觉资源。

* \[✅\] 分析目标网站架构，确认其使用的技术栈为 AngularJS 1.x。  
* \[✅\] 编写基于 Playwright 的全自动静态资源抓取脚本 (go-fetch.js)。  
* \[✅\] 配置本地代理，绕过网络限制。  
* \[✅\] 成功拦截并下载目标域名下的 index.html 以及引用的 .js、.css、字体和图片资源，并按原始路径结构存入 public/ 目录。  
* \[✅\] 手动剥离或注释掉 HTML 中无用的第三方服务加载代码（如 Google Analytics, 第三方支付组件等），净化本地运行环境。

### **阶段二：动态 API 数据拦截与存档 (TODO)**

**目标：** 模拟真实用户的浏览行为，提取所有需要认证的文章和目录数据。

* \[ \] 基于 Playwright 编写新的数据抓取脚本 (fetch\_api\_data.js)。  
* \[ \] 在脚本中注入登录态 (Cookie 或 LocalStorage Token)。  
* \[ \] 配置 page.on('response') 拦截器，专门过滤 Fetch/XHR 类型的 API 请求。  
* \[ \] 编写自动化遍历逻辑：自动访问目录接口获取列表 \-\> 循环访问每篇文章详情页。  
* \[ \] 将拦截到的 JSON 数据根据原 API 路径映射，自动创建并保存到本地的 mock\_data/ 文件夹中。*(难点：处理 URL 中的 Query 参数和时间戳，确保文件名合法且能被对应查找)*

### **阶段三：本地 Mock 引擎搭建与联调 (TODO)**

**目标：** 重构前后端连接，让本地数据驱动本地前端。

* \[ \] 安装 Express 和相关中间件 (npm install express connect-history-api-fallback cors)。  
* \[ \] 编写轻量级服务端代码 (server.js)。  
* \[ \] **配置静态托管：** 将根目录指向 public/。  
* \[ \] **配置路由 Fallback：** 引入 connect-history-api-fallback，确保 Angular 刷新时前端路由不会报 404 错误。  
* \[ \] **核心接口劫持：** 拦截前端所有发往 /api/ (或特定前缀) 的请求，将其重定向去读取 mock\_data/ 下对应的 .json 文件并返回给前端。  
* \[ \] 联调测试：修复由于环境缺失导致的 JS 报错，补全缺失的“占位” API（如用户信息校验接口返回伪造的合法信息），直至页面能在本地流畅无错运行。