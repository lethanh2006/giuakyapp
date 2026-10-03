"use strict";

function normalizeRouteTemplate(route) {
  if (typeof route !== "string" || !route.trim()) {
    return "unknown";
  }

  const withoutQuery = route.trim().split(/[?#]/, 1)[0];
  return withoutQuery
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi,
      "/:id",
    )
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, "/:id")
    .slice(0, 200);
}

module.exports = { normalizeRouteTemplate };
