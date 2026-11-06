const { app, BrowserWindow, net, protocol, session } = require("electron");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const { assetPath } = require("./asset-path.cjs");

protocol.registerSchemesAsPrivileged([{
  scheme: "ruinfall", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);
app.setName("Ruinfall");
const verification = process.argv.includes("--verify-build") && process.env.RUINFALL_VERIFY_REPORT;
if (verification) {
  const profile = path.join(path.dirname(verification), "desktop-check-profile");
  fs.mkdirSync(profile, { recursive: true });
  app.setPath("userData", profile);
}
let window;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
      (_details, callback) => callback({ cancel: true }));
    const root = path.join(app.getAppPath(), "game");
    const assetErrors = [];
    protocol.handle("ruinfall", request => {
      const file = assetPath(root, request.url);
      if (!file || request.method !== "GET") return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(file).href).catch(() => {
        if (verification) assetErrors.push(`Missing local asset: ${request.url}`);
        return new Response("Not found", { status: 404 });
      });
    });
    window = new BrowserWindow({
      title: "Ruinfall", width: 1440, height: 960, minWidth: 960, minHeight: 640,
      show: !verification,
      backgroundColor: "#111516", icon: path.join(app.getAppPath(), "icon.png"),
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    window.setMenu(null);
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith("ruinfall://game/")) event.preventDefault();
    });
    window.webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown" && input.key === "F11") {
        event.preventDefault(); window.setFullScreen(!window.isFullScreen());
      }
    });
    if (verification) require("./verify.cjs").verifyWindow(app, window, verification, assetErrors);
    window.loadURL("ruinfall://game/");
    window.on("closed", () => { window = null; });
  });
  app.on("window-all-closed", () => app.quit());
}
