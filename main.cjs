const { app, BrowserWindow } = require("electron");
const path = require("path");

// In production, start the Express server inline
if (process.env.NODE_ENV === "production" || app.isPackaged) {
  process.env.NODE_ENV = "production";
  try {
    // Start the bundled Express server
    require("./dist/server.cjs");
  } catch (err) {
    console.error("Failed to start inline Express server:", err);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "TCF Smart Billing & ERP System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the Express server URL
  mainWindow.loadURL("http://localhost:3000");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
