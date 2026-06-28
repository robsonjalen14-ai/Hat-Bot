import assert from "node:assert/strict";
import test from "node:test";
import {
  extractDepotIdsFromLua,
  extractDirectManifestFileNames,
  isZipBytes,
  lookupPackage,
  lookupRepositoryPackage
} from "../src/github.js";
import { createFlatZipFromEntries, createLuaManifestZip, createLuaZip, crc32, readZipEntries } from "../src/zip.js";

test("crc32 matches known value", () => {
  assert.equal(crc32(new TextEncoder().encode("hello")), 0x3610a686);
});

test("createLuaZip creates a valid zip signature", () => {
  const zip = createLuaZip("480", new TextEncoder().encode("print('ok')"));
  assert.equal(isZipBytes(zip), true);
  assert.match(new TextDecoder().decode(zip), /480\.lua/);
});

test("createLuaManifestZip stores lua and manifest files at zip root without duplicates", () => {
  const zip = createLuaManifestZip("480", new TextEncoder().encode("print('ok')"), [
    { fileName: "228980_111.manifest", bytes: new TextEncoder().encode("manifest-a") },
    { fileName: "228980_111.manifest", bytes: new TextEncoder().encode("manifest-a-duplicate") },
    { fileName: "228981_222.manifest", bytes: new TextEncoder().encode("manifest-b") }
  ]);
  const text = new TextDecoder().decode(zip);
  assert.match(text, /480\.lua/);
  assert.match(text, /228980_111\.manifest/);
  assert.match(text, /228981_222\.manifest/);
  assert.doesNotMatch(text, /scripts\/480\.lua/);
});

test("createFlatZipFromEntries preserves existing manifests and adds only missing files", () => {
  const encoder = new TextEncoder();
  const zip = createFlatZipFromEntries([
    { name: "nested/480.lua", bytes: encoder.encode("lua") },
    { name: "nested/228980_111.manifest", bytes: encoder.encode("existing") }
  ], [
    { fileName: "228980_111.manifest", bytes: encoder.encode("replacement") },
    { fileName: "228981_222.manifest", bytes: encoder.encode("new") }
  ]);
  const entries = readZipEntries(zip);
  const names = entries.map((entry) => entry.name).sort();
  const existing = entries.find((entry) => entry.name === "228980_111.manifest");

  assert.deepEqual(names, ["228980_111.manifest", "228981_222.manifest", "480.lua"]);
  assert.equal(new TextDecoder().decode(existing.bytes), "existing");
});

test("lua parser extracts depot ids and direct manifest names", () => {
  const lua = `
    addappid(228980, 1, "abcdef123456")
    addappid(228980, 1, "abcdef123456")
    addappid(228981, 1, "abcdef123456")
    local file = "228980_111.manifest"
  `;
  assert.deepEqual(extractDepotIdsFromLua(lua), ["228980", "228981"]);
  assert.deepEqual(extractDirectManifestFileNames(lua), ["228980_111.manifest"]);
});

test("lookupPackage returns null when configured database misses", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];

  globalThis.fetch = async (url, options = {}) => {
    seen.push({ url: String(url), method: options.method || "GET" });
    return new Response("not found", { status: 404 });
  };

  try {
    const result = await lookupPackage({
      DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
      DATABASE_2_URL: "",
      DATABASE_BASE_PATHS: ""
    }, "999999999");

    assert.equal(result, null);
    assert.equal(seen.some((entry) => /gamegen|qwe213312|BlissBlender/i.test(entry.url)), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupPackage bundles a configured database lua into a zip", async () => {
  const originalFetch = globalThis.fetch;
  const encoder = new TextEncoder();
  const lua = encoder.encode("print('ok')");

  globalThis.fetch = async (url, options = {}) => {
    const value = String(url);
    const method = options.method || "GET";
    if (method === "HEAD" && value.endsWith("/480.zip")) return new Response("", { status: 404 });
    if (method === "HEAD" && value.endsWith("/480.lua")) return new Response("", { status: 200 });
    if (method === "GET" && value.endsWith("/480.lua")) return new Response(lua, { status: 200 });
    return new Response("not found", { status: 404 });
  };

  try {
    const result = await lookupPackage({
      DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
      DATABASE_2_URL: "",
      DATABASE_BASE_PATHS: ""
    }, "480");

    assert.equal(result.source, "Used Hat Manifest Repo");
    assert.equal(result.kind, "lua");
    assert.equal(isZipBytes(result.bytes), true);
    assert.deepEqual(readZipEntries(result.bytes).map((entry) => entry.name), ["480.lua"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lookupRepositoryPackage can check Hat Manifest repo without downloading bytes", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];

  globalThis.fetch = async (url, options = {}) => {
    seen.push({ url: String(url), method: options.method || "GET" });
    if ((options.method || "GET") === "HEAD" && String(url).endsWith("/480.zip")) {
      return new Response("", { status: 200 });
    }
    throw new Error("Unexpected download");
  };

  try {
    const result = await lookupRepositoryPackage({
      DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
      DATABASE_2_URL: "",
      DATABASE_BASE_PATHS: ""
    }, "480", { includeBytes: false });

    assert.equal(result.kind, "zip");
    assert.equal(result.bytes, undefined);
    assert.equal(seen.some((entry) => entry.method === "GET"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
