const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/worker.js";
let text = fs.readFileSync(path, "utf8");

// 1. Add sendInteractionFollowup to the discord.js import
const oldImport = "  sendChannelMessage,\n  storeAndSendModLog,";
const newImport = "  sendChannelMessage,\n  sendInteractionFollowup,\n  storeAndSendModLog,";

if (text.includes(oldImport)) {
  text = text.replace(oldImport, newImport);
  console.log("Added sendInteractionFollowup to import");
} else {
  console.log("Import pattern not found");
}

// 2. Change sendChannelMessage to sendInteractionFollowup for the remaining count
const oldMsg = 'await sendChannelMessage(env, interaction.channel_id, "", {\n          embeds: [messageEmbed("", "⏱️ You have " + updated.remaining + " generations remaining today.", MOD)]\n        });';

const newMsg = 'await sendInteractionFollowup(env, interaction, "", {\n          embeds: [messageEmbed("", "⏱️ You have " + updated.remaining + " generations remaining today.", MOD)]\n        });';

if (text.includes(oldMsg)) {
  text = text.replace(oldMsg, newMsg);
  console.log("Changed to ephemeral follow-up");
} else {
  console.log("Message pattern not found");
  // Try with different formatting
  const idx = text.indexOf('sendChannelMessage(env, interaction.channel_id');
  if (idx >= 0) {
    console.log("Found at index:", idx);
    console.log("Context:", text.substring(idx, idx + 200));
  }
}

fs.writeFileSync(path, text, "utf8");
console.log("Done");
