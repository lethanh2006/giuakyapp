"use strict";

const { AsyncLocalStorage } = require("node:async_hooks");
const { sanitizeValue } = require("./sanitizer");

const STORAGE_SYMBOL = Symbol.for("@nrapp/observability.log-context");

if (!globalThis[STORAGE_SYMBOL]) {
  globalThis[STORAGE_SYMBOL] = new AsyncLocalStorage();
}

const storage = globalThis[STORAGE_SYMBOL];

function cleanContextFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return sanitizeValue(result);
}

function runWithLogContext(fields, callback, ...args) {
  if (typeof callback !== "function") {
    throw new TypeError("callback must be a function");
  }

  const parent = storage.getStore() || {};
  const next = Object.freeze({
    ...parent,
    ...cleanContextFields(fields),
  });

  return storage.run(next, callback, ...args);
}

function getLogContext() {
  return storage.getStore() || {};
}

function getCorrelationFields() {
  // Pino merges event fields into this object; keep the request store immutable.
  return { ...getLogContext() };
}

module.exports = {
  getCorrelationFields,
  getLogContext,
  runWithLogContext,
};
