import test from "node:test";
import assert from "node:assert/strict";
import { RESET_CREDITS_ENDPOINT, fetchResetCredits, parseResetCredits } from "../src/api.js";

const sample = {
  available_count: 2,
  credits: [
    {
      title: "Later",
      status: "available",
      reset_type: "codex_rate_limits",
      granted_at: "2026-06-18T00:00:00Z",
      expires_at: "2026-07-18T00:00:00Z",
    },
    {
      title: "Sooner",
      status: "available",
      reset_type: "codex_rate_limits",
      granted_at: "2026-06-12T00:00:00Z",
      expires_at: "2026-07-12T00:00:00Z",
    },
  ],
};

test("fetchResetCredits sends required headers", async () => {
  const data = await fetchResetCredits({
    accessToken: "token",
    accountId: "account",
    fetchFn: async (url, options) => {
      assert.equal(url, RESET_CREDITS_ENDPOINT);
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Bearer token");
      assert.equal(options.headers["ChatGPT-Account-ID"], "account");
      assert.equal(options.headers["OpenAI-Beta"], "codex-1");
      assert.equal(options.headers.originator, "Codex Desktop");
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(sample),
      };
    },
  });

  assert.deepEqual(data, sample);
});

test("fetchResetCredits reports HTTP errors", async () => {
  await assert.rejects(
    fetchResetCredits({
      accessToken: "token",
      accountId: "account",
      fetchFn: async () => ({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      }),
    }),
    /HTTP 401/,
  );
});

test("parseResetCredits validates and sorts credits by expiry", () => {
  const report = parseResetCredits(sample);
  assert.equal(report.availableCount, 2);
  assert.equal(report.credits[0].title, "Sooner");
  assert.equal(report.credits[1].title, "Later");
});

test("parseResetCredits fails clearly when response shape changes", () => {
  assert.throws(() => parseResetCredits({ available_count: 1, credits: [{}] }), /granted_at/);
});
