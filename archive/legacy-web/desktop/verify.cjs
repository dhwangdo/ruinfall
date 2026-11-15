const fs = require("node:fs");

/** Hidden launch check for the packaged build; never runs in normal play. */
function verifyWindow(app, window, reportPath, assetErrors) {
  const errors = [];
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    const report = { title: window.webContents.getTitle(), url: window.webContents.getURL(),
      errors: [...errors, ...assetErrors], checkedAt: new Date().toISOString() };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    app.exit(report.errors.length ? 1 : 0);
  };
  const timeout = setTimeout(() => { errors.push("Game load timed out"); finish(); }, 30_000);
  window.webContents.on("did-fail-load", (_event, code, description) => errors.push(`${code}: ${description}`));
  window.webContents.on("render-process-gone", (_event, details) => { errors.push(details.reason); finish(); });
  window.webContents.on("console-message", (_event, details) => {
    if (details.level === "error") errors.push(details.message);
  });
  window.webContents.once("did-finish-load", () => {
    clearTimeout(timeout);
    setTimeout(finish, 5_000);
  });
}
module.exports = { verifyWindow };
