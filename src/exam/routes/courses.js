"use strict";

const express = require("express");
const { listCourses } = require("../services/questions");

const router = express.Router();

router.get("/courses", (_req, res) => {
  res.json(listCourses());
});

module.exports = router;
