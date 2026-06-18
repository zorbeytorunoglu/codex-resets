import { CodexResetsError } from "./errors.js";

export const RESET_CREDITS_ENDPOINT =
  "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function truncateDetail(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "";
  }

  return value.length > 500 ? value.slice(0, 500) + "..." : value;
}

export async function fetchResetCredits({
  accessToken,
  accountId,
  fetchFn = globalThis.fetch,
  timeoutMs = 15_000,
} = {}) {
  if (typeof fetchFn !== "function") {
    throw new CodexResetsError("This Node runtime does not provide fetch. Use Node 20 or newer.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchFn(RESET_CREDITS_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + accessToken,
        "ChatGPT-Account-ID": accountId,
        "OpenAI-Beta": "codex-1",
        originator: "Codex Desktop",
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new CodexResetsError("Timed out while contacting reset-credit endpoint.", {
        cause: error,
      });
    }

    throw new CodexResetsError("Could not reach reset-credit endpoint: " + error.message, {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.text();
  if (!response.ok) {
    const detail = truncateDetail(body.trim());
    const suffix = detail ? ": " + detail : "";
    throw new CodexResetsError("Endpoint returned HTTP " + response.status + suffix);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    throw new CodexResetsError("Endpoint returned non-JSON data.", { cause: error });
  }

  if (!isObject(data)) {
    throw new CodexResetsError("Endpoint response shape changed: expected a JSON object.");
  }

  return data;
}

function parseDate(value, fieldName) {
  if (typeof value !== "string" || value.length === 0) {
    throw new CodexResetsError(
      "Endpoint response shape changed: " + fieldName + " is missing or not a string.",
    );
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CodexResetsError(
      "Endpoint response shape changed: " + fieldName + " is not an ISO datetime.",
    );
  }

  return date;
}

export function parseResetCredits(data) {
  if (!isObject(data)) {
    throw new CodexResetsError("Endpoint response shape changed: expected a JSON object.");
  }

  if (!Number.isInteger(data.available_count)) {
    throw new CodexResetsError(
      "Endpoint response shape changed: available_count is missing or not an integer.",
    );
  }

  if (!Array.isArray(data.credits)) {
    throw new CodexResetsError(
      "Endpoint response shape changed: credits is missing or not a list.",
    );
  }

  const credits = data.credits.map((credit, index) => {
    const displayIndex = index + 1;
    if (!isObject(credit)) {
      throw new CodexResetsError(
        "Endpoint response shape changed: credits[" + displayIndex + "] is not an object.",
      );
    }

    const grantedAt = parseDate(credit.granted_at, "credits[" + displayIndex + "].granted_at");
    const expiresAt = parseDate(credit.expires_at, "credits[" + displayIndex + "].expires_at");

    return {
      title:
        typeof credit.title === "string" && credit.title.length > 0
          ? credit.title
          : "Reset credit " + displayIndex,
      status:
        typeof credit.status === "string" && credit.status.length > 0 ? credit.status : "unknown",
      resetType:
        typeof credit.reset_type === "string" && credit.reset_type.length > 0
          ? credit.reset_type
          : "unknown",
      grantedAt,
      expiresAt,
    };
  });

  credits.sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());

  return {
    availableCount: data.available_count,
    credits,
  };
}
