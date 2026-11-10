const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { openDatabase, listFolders, addFolders, removeFolder } = require('./db');

// One window. The page asks this process to open the folder dialog and the
// database, because the page itself has no filesystem access.
let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#121214',
    title: 'FL Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // The event object carries level: "warning" | "error" | "info" | "debug".
  win.webContents.on('console-message', (event) => {
    if (event.level === 'warning' || event.level === 'error') {
      console.error(`[ui] ${event.message}`);
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  const dataPath = app.getPath('userData');
  db = openDatabase(path.join(dataPath, 'flmanager.db'));

  ipcMain.handle('folders:list', () => listFolders(db));
  ipcMain.handle('app:dataPath', () => dataPath);
  ipcMain.handle('folders:add', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win, {
      title: 'Add project folders',
      buttonLabel: 'Add',
      properties: ['openDirectory', 'multiSelections'],
    });
    if (result.canceled) return listFolders(db);
    return addFolders(db, result.filePaths);
  });
  ipcMain.handle('folders:remove', (_event, folderPath) => removeFolder(db, folderPath));

  createWindow();
});

// This app is a single window, so closing it quits on macOS and Windows.
app.on('window-all-closed', () => {
  app.quit();
});
