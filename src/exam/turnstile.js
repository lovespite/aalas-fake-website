"use strict";

const { TURNSTILE_SECRET, TURNSTILE_VERIFY_URL } = require("./config");

if (!TURNSTILE_SECRET) {
  console.warn(
    "[warn] 未设置 TURNSTILE_SECRET, /api/exam/grade 将跳过人机验证(仅适合本地开发)。"
  );
} else {
  console.log("[info] 已配置 TURNSTILE_SECRET, /api/exam/grade 将启用人机验证。");
}

async function verifyTurnstile(token, remoteip) {
  if (!TURNSTILE_SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: "missing-cf-turnstile-response" };
  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (remoteip) body.set("remoteip", remoteip);
    const r = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await r.json();
    if (data.success) return { ok: true, data };
    return {
      ok: false,
      error: (data["error-codes"] || []).join(",") || "verify-failed",
      data,
    };
  } catch (e) {
    return { ok: false, error: "verify-exception:" + e.message };
  }
}

/**
 * 生成 Turnstile 校验中间件。
 * - 从 body.cfTurnstileResponse 或请求头 cf-turnstile-response 中提取 token
 * - 校验失败返回 403 captcha_failed
 * - logTag 仅用于日志输出
 */
function turnstileMiddleware(logTag = "turnstile") {
  return async function turnstile(req, res, next) {
    const cfToken =
      (req.body && req.body.cfTurnstileResponse) || req.get("cf-turnstile-response");
    const ip = req.clientIp || req.ip || "";
    const verify = await verifyTurnstile(cfToken, ip);
    if (!verify.ok) {
      console.warn(`[${logTag}] 校验失败:`, verify.error);
      return res.status(403).json({ error: "captcha_failed", reason: verify.error });
    }
    req.turnstile = verify;
    next();
  };
}

module.exports = { verifyTurnstile, turnstileMiddleware };
