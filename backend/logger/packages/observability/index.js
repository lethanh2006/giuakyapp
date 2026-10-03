"use strict";

const contextHelpers = require("./context");
const errorHelpers = require("./errors");
const exceptionLoggerHelpers = require("./exception-logger");
const httpBoundaryHelpers = require("./http-boundary");
const loggerHelpers = require("./logger");
const requestIdHelpers = require("./request-id");
const routeHelpers = require("./route");
const sanitizerHelpers = require("./sanitizer");

async function flushLogger(logger) {
  if (logger && typeof logger.flush === "function") {
    await Promise.resolve(logger.flush());
  }
  return true;
}

module.exports = {
  ...contextHelpers,
  ...errorHelpers,
  ...exceptionLoggerHelpers,
  ...httpBoundaryHelpers,
  ...loggerHelpers,
  ...requestIdHelpers,
  ...routeHelpers,
  ...sanitizerHelpers,
  flushLogger,
};
