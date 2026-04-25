"use strict";

const express = require("express");
const {
  SESSION_TTL_MS,
  SESSION_MAX_DISTINCT_COURSES,
  SESSION_MAX_MOCK,
  SESSION_MAX_TOTAL_FETCH,
  BIND_SESSION_IP,
} = require("../config");
const { turnstileMiddleware } = require("../turnstile");
const { createSession } = require("../middleware");

const router = express.Router();

// 颁发考试会话 token：必须先通过 Cloudflare Turnstile
router.post("/session/start", turnstileMiddleware("turnstile/session.start"), (req, res) => {
  const { token, session } = createSession(req.clientIp);
  console.log(
    `[session] new token=${token.slice(0, 8)}… ip=${req.clientIp} bindIp=${BIND_SESSION_IP}`
  );
  res.json({
    token,
    expiresAt: session.expiresAt,
    ttlMs: SESSION_TTL_MS,
    quota: {
      maxDistinctCourses: SESSION_MAX_DISTINCT_COURSES,
      maxMock: SESSION_MAX_MOCK,
      maxTotal: SESSION_MAX_TOTAL_FETCH,
    },
  });
});

module.exports = router;
