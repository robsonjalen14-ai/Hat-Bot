/*
  HAT MANIFEST BOT - BOT HOSTING ENTRY FILE

  Paste tokens here OR set them in your host's environment variables.
  Environment variables override these values.
*/
const HAT_BOT_CONFIG = {
  DISCORD_TOKEN: "PUT_DISCORD_BOT_TOKEN_HERE",
  GITHUB_TOKEN: "PUT_GITHUB_TOKEN_HERE",

  DISCORD_PUBLIC_KEY: "3d073f5be99498a91f0962cb715f56ad8e915bd2e9f58739e3bf6482093ef469",
  DISCORD_APPLICATION_ID: "947389898531430421",

  REQUEST_CHANNEL: "1507608145021632542",
  MOD_LOG_CHANNEL: "1507761568891404308",
  TICKET_LOG_CHANNEL: "1485507520335446147",
  TICKET_CATEGORY_ID: "1485507604049563718",

  DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
  DATABASE_2_URL: "",
  DATABASE_BASE_PATHS: ",manifests",

  GITHUB_OWNER: "robsonjalen14-ai",
  GITHUB_REPO: "hat-database",
  GITHUB_BRANCH: "main",

  CHAT_UPLOAD_MAX_BYTES: "95000000",
  STORAGE_FILE: "./hat-bot-storage.json"
};

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import worker from "./src/index.js";

const DEFAULT_ENV = {
  MANIFEST_PRIMARY_URLS: "",
  MANIFEST_FALLBACK_URLS: "",
  MANIFEST_REPOSITORY_BASE_PATHS: ""
};

const env = {
  ...DEFAULT_ENV,
  ...HAT_BOT_CONFIG,
  ...process.env
};

function loadStore(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function saveStore(filePath, data) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createLocalBotStorage(filePath) {
  const storePath = filePath || "./hat-bot-storage.json";
  const storage = {
    async get(key) {
      return loadStore(storePath)[key];
    },
    async put(key, value) {
      const data = loadStore(storePath);
      data[key] = value;
      saveStore(storePath, data);
    },
    async delete(key) {
      const data = loadStore(storePath);
      delete data[key];
      saveStore(storePath, data);
    }
  };

  return {
    idFromName(name) {
      return name;
    },
    get() {
      return {
        async fetch(_url, request) {
          const body = await request.json();
          const key = body.key;

          switch (body.op) {
            case "get": {
              const value = await storage.get(key);
              return Response.json({ value: value ?? body.fallback ?? null });
            }
            case "put": {
              await storage.put(key, body.value);
              return Response.json({ ok: true });
            }
            case "delete": {
              await storage.delete(key);
              return Response.json({ ok: true });
            }
            case "manifestJobStartUpload": {
              const jobs = await storage.get("manifestJobs") || [];
              const index = jobs.findIndex((job) => String(job.id) === String(body.jobId));
              if (index === -1) return Response.json({ ok: false, reason: "NOT_FOUND" });
              const job = jobs[index];
              if (job.status === "COMPLETED" || job.uploaded) return Response.json({ ok: false, reason: "COMPLETED", job });
              if (job.status === "UPLOADING") return Response.json({ ok: false, reason: "UPLOADING", job });
              jobs[index] = {
                ...job,
                status: "UPLOADING",
                uploadStartedBy: body.userId,
                uploadStartedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              await storage.put("manifestJobs", jobs);
              return Response.json({ ok: true, job: jobs[index] });
            }
            case "manifestChatUploadSessionStart": {
              const sessions = await storage.get("manifestChatUploadSessions") || {};
              const now = Date.now();
              for (const [userId, session] of Object.entries(sessions)) {
                if (!session?.expiresAt || Number(session.expiresAt) <= now) delete sessions[userId];
              }
              const existing = sessions[body.session?.userId];
              if (existing && Number(existing.expiresAt) > now) {
                await storage.put("manifestChatUploadSessions", sessions);
                return Response.json({ ok: false, reason: "ACTIVE", session: existing });
              }
              sessions[body.session.userId] = body.session;
              await storage.put("manifestChatUploadSessions", sessions);
              return Response.json({ ok: true, session: body.session });
            }
            case "manifestChatUploadSessionEnd": {
              const sessions = await storage.get("manifestChatUploadSessions") || {};
              const existing = sessions[body.userId];
              if (!existing || existing.id === body.sessionId) {
                delete sessions[body.userId];
                await storage.put("manifestChatUploadSessions", sessions);
              }
              return Response.json({ ok: true });
            }
            default:
              return Response.json({ error: "Unknown storage op." }, { status: 400 });
          }
        }
      };
    }
  };
}

env.BOT_STORAGE = env.BOT_STORAGE || createLocalBotStorage(env.STORAGE_FILE);

const port = Number(env.PORT || env.SERVER_PORT || 3000);

function requestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on("error", reject);
  });
}

function requestUrl(req) {
  const protocol = env.PUBLIC_URL?.startsWith("https://") ? "https" : "http";
  const host = req.headers.host || `localhost:${port}`;
  return `${protocol}://${host}${req.url || "/"}`;
}

function waitUntil(promise) {
  Promise.resolve(promise).catch((error) => {
    console.error("[waitUntil]", error);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const body = ["GET", "HEAD"].includes(req.method || "GET")
      ? undefined
      : await requestBody(req);
    const request = new Request(requestUrl(req), {
      method: req.method,
      headers: req.headers,
      body
    });
    const response = await worker.fetch(request, env, { waitUntil });

    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[server]", error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Hat Manifest bot listening on port ${port}`);
});
