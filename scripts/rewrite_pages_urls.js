/**
 * 把 mock_data/api/Pages/*.json 中各 page.content 里的绝对 URL 改成相对路径
 *   例如  https://example.com/foo/bar.mp3   →  /foo/bar.mp3
 *         http://x.y.z:8080/a.png?v=1#id   →  /a.png?v=1#id
 *
 * 用法：
 *   node scripts/rewrite_pages_urls.js              # 实际写回
 *   node scripts/rewrite_pages_urls.js --dry-run    # 仅打印统计，不修改文件
 *
 * 跳过：*.meta.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'mock_data', 'api', 'Pages');
const DRY = process.argv.includes('--dry-run');

// 匹配 http(s)://host[:port]，捕获其后剩余部分（path?query#hash 或空）
// host 中不允许 / " ' < > 空白，避免越界吃到下一段内容
const ABS_URL_RE = /\bhttps?:\/\/[^/\s"'<>]+(\/[^\s"'<>]*)?/gi;

function rewriteContent(content) {
  let count = 0;
  const out = content.replace(ABS_URL_RE, (_m, rest) => {
    count++;
    return rest || '/';
  });
  return { out, count };
}

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`目录不存在: ${DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'));

  let totalReplacements = 0;
  let filesChanged = 0;
  let pagesScanned = 0;

  for (const file of files) {
    const full = path.join(DIR, file);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      console.warn(`[skip] ${file} 解析失败: ${e.message}`);
      continue;
    }

    const pages = Array.isArray(json && json.pages) ? json.pages : [];
    let fileCount = 0;

    for (const page of pages) {
      pagesScanned++;
      if (!page || typeof page.content !== 'string' || !page.content) continue;
      const { out, count } = rewriteContent(page.content);
      if (count > 0) {
        page.content = out;
        fileCount += count;
      }
    }

    if (fileCount > 0) {
      filesChanged++;
      totalReplacements += fileCount;
      if (!DRY) {
        fs.writeFileSync(full, JSON.stringify(json, null, 2), 'utf8');
      }
      console.log(`${DRY ? '[dry] ' : ''}${file}: 替换 ${fileCount} 处`);
    }
  }

  console.log('---------------------------------------------');
  console.log(`扫描文件数: ${files.length}`);
  console.log(`扫描 page 数: ${pagesScanned}`);
  console.log(`修改文件数: ${filesChanged}${DRY ? ' (未写入)' : ''}`);
  console.log(`替换总数:   ${totalReplacements}`);
}

main();
