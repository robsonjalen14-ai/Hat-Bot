import http from "node:http";
import worker from "./src/index.js";

const DEFAULT_ENV = {
  DISCORD_PUBLIC_KEY: "3d073f5be99498a91f0962cb715f56ad8e915bd2e9f58739e3bf6482093ef469",
  DISCORD_APPLICATION_ID: "947389898531430421",
  REQUEST_CHANNEL: "1507608145021632542",
  MOD_LOG_CHANNEL: "1507761568891404308",
  TICKET_LOG_CHANNEL: "1485507520335446147",
  TICKET_CATEGORY_ID: "1485507604049563718",
  DATABASE_1_URL: "https://raw.githubusercontent.com/robsonjalen14-ai/hat-database/main/database-1/",
  DATABASE_2_URL: "",
  DATABASE_BASE_PATHS: ",manifests",
  MANIFEST_PRIMARY_URLS: "",
  MANIFEST_FALLBACK_URLS: "",
  MANIFEST_REPOSITORY_BASE_PATHS: "",
  GITHUB_OWNER: "robsonjalen14-ai",
  GITHUB_REPO: "hat-database",
  GITHUB_BRANCH: "main",
  CHAT_UPLOAD_MAX_BYTES: "95000000"
};

const env = { ...DEFAULT_ENV, ...process.env };
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
    const responseBody = Buffer.from(await response.arrayBuffer());
    res.end(responseBody);
  } catch (error) {
    console.error("[server]", error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Hat Manifest bot listening on port ${port}`);
});
