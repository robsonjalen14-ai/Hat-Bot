import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/worker.js";

test("site backfill endpoint does not publish from removed external package sources", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];

  globalThis.fetch = async (url, options = {}) => {
    seen.push({ value: String(url), method: options.method || "GET" });
    return new Response("not found", { status: 404 });
  };

  try {
    const response = await worker.fetch(new Request("https://hat-manifest-bot.test/api/backfill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://hat-manifest.vyro.workers.dev"
      },
      body: JSON.stringify({ type: "external-package", appId: "480" })
    }), {
      DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
      DATABASE_2_URL: "",
      DATABASE_BASE_PATHS: "",
      GITHUB_OWNER: "robsonjalen14-ai",
      GITHUB_REPO: "hat-database",
      GITHUB_TOKEN: "token",
      DISCORD_TOKEN: "discord-token"
    }, { waitUntil: () => null });

    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, false);
    assert.equal(data.reason, "not-found");
    assert.equal(seen.some((entry) => /gamegen|qwe213312|BlissBlender/i.test(entry.value)), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("health endpoint reports GitHub and storage readiness for Hat Manifest database", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    const method = options.method || "GET";
    if (method === "GET" && value === "https://api.github.com/repos/robsonjalen14-ai/hat-database") {
      return Response.json({ full_name: "robsonjalen14-ai/hat-database" });
    }
    throw new Error(`Unexpected fetch: ${method} ${value}`);
  };

  try {
    const response = await worker.fetch(new Request("https://hat-manifest-bot.test/health"), {
      GITHUB_OWNER: "robsonjalen14-ai",
      GITHUB_REPO: "hat-database",
      GITHUB_TOKEN: "token",
      DISCORD_TOKEN: "discord-token",
      BOT_STORAGE: {
        idFromName: () => "global",
        get: () => ({
          fetch: async (_url, request) => {
            const body = await request.json();
            if (body.op === "get") return Response.json({ value: body.fallback });
            return Response.json({ ok: true });
          }
        })
      }
    }, { waitUntil: () => null });

    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.health.checks.hatManifestDatabase, true);
    assert.equal(data.health.checks.manifestVault, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
