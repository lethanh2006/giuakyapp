"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getCorrelationFields, runWithLogContext } = require("..");

test("logger correlation uses local request context", () => {
  runWithLogContext({ request_id: "req-123" }, () => {
    assert.deepEqual(getCorrelationFields(), { request_id: "req-123" });
  });
});
