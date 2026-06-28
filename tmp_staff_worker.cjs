const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/worker.js";
let text = fs.readFileSync(path, "utf8");

// 1. Add import for staff handlers - add after the tickets.js import
const importMarker = "} from \"./tickets.js\";";
const staffImport = "\nimport {\n  handlePositionAdd,\n  handlePositionRemove,\n  handlePositionList,\n  handleStaffAdd,\n  handleStaffRemove,\n  handleStaffList,\n  handleStaffAutocomplete\n} from \"./staff.js\";";

if (text.includes(importMarker)) {
  text = text.replace(importMarker, importMarker + staffImport);
  console.log("Added staff import");
}

// 2. Add staff case to runCommand switch/case - find the default case
const defaultCase = "default:\n    throw new Error";
const staffCase = "  case \"staff\": return handleStaffDispatch(env, interaction);\n    default:\n    throw new Error";

if (text.includes(defaultCase)) {
  text = text.replace(defaultCase, staffCase);
  console.log("Added staff dispatch");
}

// 3. Add autocomplete handling for staff - find the gen autocomplete and add staff
const genAutocomplete = 'if (interaction.data.name === "gen") {';
const staffAuto = 'if (interaction.data.name === "gen") {\n    return autocompleteResponse(interaction, await searchSteamSuggestions(focusedAutocompleteValue(interaction)));\n  }\n  if (interaction.data.name === "staff") {\n    return handleStaffAutocomplete(env, interaction);\n  }';

if (text.includes(genAutocomplete)) {
  text = text.replace(genAutocomplete, staffAuto);
  console.log("Added staff autocomplete");
}

fs.writeFileSync(path, text, "utf8");
console.log("Done");
