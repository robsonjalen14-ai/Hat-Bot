const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/manifestJobs.js";
let text = fs.readFileSync(path, "utf8");

// Replace the embed to include game name
const oldEmbed = `    embeds: [{
      color: ORANGE,
      title: "🛠 Repair Request Submitted",
      description: "Upload the corrected manifest.",
      footer: { text: "Hat Manifest Repair System" },
      timestamp: new Date().toISOString()
    }]`;

const newEmbed = `    embeds: [{
      color: ORANGE,
      title: "🛠 Repair Request Submitted",
      description: [
        \`🎮 **\${game?.name || \`Steam App \${appId}\`}**\`,
        \`🆔 AppID: \${appId}\`,
        "",
        "Upload the corrected manifest using the button below."
      ].join("\n"),
      footer: { text: "Hat Manifest Repair System" },
      timestamp: new Date().toISOString()
    }]`;

if (text.includes(oldEmbed)) {
  text = text.replace(oldEmbed, newEmbed);
  fs.writeFileSync(path, text, "utf8");
  console.log("✅ Added game name to fix notification embed");
} else {
  console.log("❌ Pattern not found");
}
