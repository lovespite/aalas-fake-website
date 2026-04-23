/**
 * Angular 站点静态资源全自动下载器
 * * 运行前准备：
 * 1. 确保安装了 Node.js
 * 2. 在当前目录运行: npm init -y
 * 3. 安装依赖: npm install playwright fs-extra
 * 4. 运行脚本: node download_assets.js
 */

const { chromium } = require('playwright');
const fs = require('fs-extra'); // fs-extra 的 outputFile 方法可以自动创建多层级目录
const path = require('path');

// 目标站点的域名，防止把外面 CDN 的东西也下到本地主目录
const TARGET_DOMAIN = 'aalaslearninglibrary.org';
// 本地保存的根目录
const SAVE_DIR = path.join(__dirname, 'public');

(async () => {
  console.log('启动无头浏览器...');
  // 设置 headless: false 可以看到浏览器界面，方便你手动登录或点点点
  const browser = await chromium.launch({
    headless: false,
    proxy: {
      server: 'http://127.0.0.1:20171'
    }
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 核心逻辑：拦截所有响应
  page.on('response', async (response) => {
    const request = response.request();
    const url = new URL(request.url());

    // 1. 只拦截目标域名的请求
    if (url.hostname !== TARGET_DOMAIN) return;

    // 2. 只拦截静态资源类型 (排除 API 的 fetch/xhr，因为我们打算在阶段三再专门处理 API)
    const resourceTypes = ['document', 'stylesheet', 'image', 'media', 'font', 'script'];
    if (resourceTypes.includes(request.resourceType()) && response.status() === 200) {
      try {
        // 获取文件内容
        const body = await response.body();

        // 获取 URL 路径，例如 /bower_components/angular/angular.js
        // 去掉开头的 '/'，否则 path.join 会把它当成系统根目录
        const relativePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

        // 拼接本地保存路径
        const filePath = path.join(SAVE_DIR, relativePath);

        // 自动创建多级目录并写入文件
        await fs.outputFile(filePath, body);
        console.log(`[成功保存] -> ${relativePath}`);
      } catch (e) {
        // 有些重定向或缓存的响应可能无法获取 body，忽略即可
        console.error(`[无法保存] ${url.pathname}:`, e.message);
      }
    }
  });

  console.log(`准备访问目标网站，请在弹出的浏览器中进行登录或浏览...`);
  // 替换为你实际想要抓取的页面 URL
  await page.goto('https://aalaslearninglibrary.org/app/dashboard', { waitUntil: 'networkidle' });

  console.log('\n======================================================');
  console.log('页面已加载！你可以继续在浏览器里随便点一点。');
  console.log('只要页面加载了新的资源，后台就会自动下载到 public 目录。');
  console.log('觉得下载差不多了，在终端按下 Ctrl + C 结束脚本。');
  console.log('======================================================\n');

  // 保持脚本不退出，等待用户手动操作（比如登录、展开折叠面板触发按需加载）
  // 你可以按 Ctrl+C 终止运行
})();