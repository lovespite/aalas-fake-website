"use strict";

const fs = require("fs");
const { Database } = require("bun:sqlite");
const { DB_PATH } = require("./config");

if (!fs.existsSync(DB_PATH)) {
  console.error(`[fatal] 找不到数据库 ${DB_PATH}，请先运行: bun run exam:build`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
// bun:sqlite 没有 db.pragma()，统一用 exec 设置 PRAGMA
db.exec("PRAGMA foreign_keys = ON");

module.exports = db;
