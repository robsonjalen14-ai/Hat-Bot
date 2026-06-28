const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/worker.js";
let text = fs.readFileSync(path, "utf8");

// 1. Add handleStaffDispatch function - place it before handleAdminCommand
const adminStart = "async function handleAdminCommand(env, interaction) {";
const staffDispatch = `async function handleStaffDispatch(env, interaction) {
  await requireModerator(env, interaction);
  const action = subcommandName(interaction);

  if (action === "position") {
    const sub = interaction.data.options?.find((o) => o.name === "position")?.options?.[0];
    const subAction = sub?.name || "";
    if (subAction === "add") return handlePositionAdd(env, interaction);
    if (subAction === "remove") return handlePositionRemove(env, interaction);
    if (subAction === "list") return handlePositionList(env, interaction);
  }

  if (action === "add") return handleStaffAdd(env, interaction);
  if (action === "remove") return handleStaffRemove(env, interaction);
  if (action === "list") return handleStaffList(env, interaction);

  throw new Error("Unknown staff subcommand.");
}

`;

if (text.includes(adminStart)) {
  text = text.replace(adminStart, staffDispatch + adminStart);
  console.log("Added handleStaffDispatch");
}

// 2. Add the case to runCommand
const defaultCase = "default:\n    throw new Error(\"Unknown command.\");";
// Try to find the existing default
const defaultMatch = text.indexOf('throw new Error("Unknown command.")');
if (defaultMatch >= 0) {
  // Go back to find the "default:" part
  const startOfDefault = text.lastIndexOf("default:", defaultMatch);
  // Insert staff case before default
  const staffCaseBlock = "  case \"staff\": return handleStaffDispatch(env, interaction);\n    default:";
  text = text.substring(0, startOfDefault) + staffCaseBlock + text.substring(startOfDefault + 8);
  console.log("Added staff case to runCommand");
}

fs.writeFileSync(path, text, "utf8");
console.log("Done");
