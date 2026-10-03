"use strict";

const {
  classifyException,
  createErrorId,
  exceptionFields,
} = require("./errors");
const { sanitizeText, sanitizeValue } = require("./sanitizer");

function logException(
  logger,
  eventName,
  error,
  eventContext = {},
  options = {},
) {
  if (!logger || typeof logger.error !== "function") {
    throw new TypeError("logger must implement the Pino logging methods");
  }

  const classification = classifyException(error, options.classification);
  const errorId = options.errorId || eventContext["error.id"] || createErrorId();
  const fields = {
    ...sanitizeValue(eventContext),
    "event.name": eventName,
    ...exceptionFields(error, classification, errorId),
  };
  const level =
    typeof logger[classification.logLevel] === "function"
      ? classification.logLevel
      : "error";

  logger[level](
    fields,
    sanitizeText(
      options.message ||
        (classification.expected
          ? classification.safeMessage
          : "Unexpected application error"),
    ),
  );

  return { errorId, classification };
}

module.exports = { logException };
