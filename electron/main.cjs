const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const net = require("net");

const PORT = process.env.DESK_PORT || "3847";
const HOST = "127.0.0.1";

let mainWindow = null;
let serverProcess = null;

function standaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone");
  }
  return path.join(__dirname, "..", ".next", "standalone");
}

function nodeCommand() {
  if (process.platform === "win32") {
    const bundled = path.join(process.resourcesPath, "node", "node.exe");
    if (fs.existsSync(bundled)) return bundled;
  }
  return process.platform === "win32" ? "node.exe" : "node";
}

function waitForPort(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect(port, HOST, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error("Délai dépassé : le serveur ne répond pas."));
        } else {
          setTimeout(tryOnce, 250);
        }
      });
    };
    tryOnce();
  });
}

function startNextServer() {
  const cwd = standaloneDir();
  const serverJs = path.join(cwd, "server.js");
  if (!fs.existsSync(serverJs)) {
    dialog.showErrorBox(
      "Installation incomplète",
      `Fichier serveur introuvable :\n${serverJs}\n\nRéinstalle l’application ou reconstruis l’installeur.`,
    );
    app.quit();
    return;
  }

  const node = nodeCommand();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT,
    HOSTNAME: HOST,
  };

  serverProcess = spawn(node, ["server.js"], {
    cwd,
    env,
    stdio: app.isPackaged ? "pipe" : "inherit",
    windowsHide: true,
  });

  serverProcess.on("error", (err) => {
    dialog.showErrorBox(
      "Node.js requis",
      `Impossible de lancer le serveur :\n${err.message}\n\n` +
        "Installe Node.js LTS (https://nodejs.org) puis réessaie,\n" +
        "ou place node.exe dans le dossier resources/node/ de l’application.",
    );
    app.quit();
  });

  if (serverProcess.stderr && app.isPackaged) {
    serverProcess.stderr.on("data", (d) => {
      try {
        fs.appendFileSync(
          path.join(app.getPath("userData"), "desk-server.log"),
          String(d),
        );
      } catch {
        /* ignore */
      }
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(`http://${HOST}:${PORT}/skale`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function killServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch {
      /* ignore */
    }
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  startNextServer();
  try {
    await waitForPort(parseInt(String(PORT), 10));
    createWindow();
  } catch (e) {
    dialog.showErrorBox(
      "Serveur",
      `Le serveur local n’a pas démarré.\n${e.message}\n\n` +
        "Vérifie qu’aucun autre programme n’utilise le port " +
        PORT +
        ".\nConsulte %APPDATA%/Desk Cursor/desk-server.log (Windows) en cas d’erreur.",
    );
    killServer();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  killServer();
  app.quit();
});

app.on("before-quit", () => {
  killServer();
});
