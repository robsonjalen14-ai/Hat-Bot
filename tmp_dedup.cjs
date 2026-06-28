const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/worker.js";
let text = fs.readFileSync(path, "utf8");

// Add duplicate request check
// Current code:
//   const requests = await getStored(env, "requests", []);
//   requests.unshift(requestEntry);
// Change to: check for existing appId first

const oldCode = `  const requests = await getStored(env, "requests", []);
  requests.unshift(requestEntry);`;

const newCode = `  const requests = await getStored(env, "requests", []);

  // Check for duplicate request by same user
  const existing = requests.find((r) => r.appid === appId && r.userId === user.id);
  if (existing) {
    throw new Error(\`AppID \${appId} has already been requested. Check <#\${await getChannelSetting(env, "request")}>.\`);
  }

  requests.unshift(requestEntry);`;

if (text.includes(oldCode)) {
  text = text.replace(oldCode, newCode);
  fs.writeFileSync(path, text, "utf8");
  console.log("✅ Added duplicate request check");
} else {
  console.log("❌ Pattern not found");
}
