const fs = require("fs");
const path = "E:/Hat-Manifest-Bot/src/commands.js";
let text = fs.readFileSync(path, "utf8");

// Add staff command definition - find the end of RAW_COMMANDS
// The staff command should go after the last command before the closing bracket
// Look for the last command definition

const staffCmd = `,
  {
    name: "staff",
    description: "Staff management system",
    options: [
      sub("position", "Manage staff positions", [
        sub("add", "Create a new staff position", [
          textOption("name", "Position name"),
          roleOption
        ]),
        sub("remove", "Remove a staff position", [
          textOption("name", "Position name")
        ]),
        sub("list", "List all staff positions")
      ]),
      sub("add", "Add a staff member", [
        userOption,
        textOption("position", "Staff position", true, 100),
        textOption("reason", "Reason for adding", false, 500)
      ]),
      sub("remove", "Remove a staff member", [
        userOption
      ]),
      sub("list", "List all staff members", [
        textOption("page", "Page number", false, 3)
      ])
    ]
  }`;

// Insert before the COMMANDS export line
const marker = "];\n\nexport const COMMANDS";
const idx = text.indexOf(marker);
if (idx >= 0) {
  text = text.substring(0, idx) + staffCmd + "\n" + text.substring(idx);
  console.log("Added staff command definition");
  fs.writeFileSync(path, text, "utf8");
}
