const { contextBridge, ipcRenderer } = require('electron');

// The page only gets these three calls. It cannot require Node or touch the disk.
contextBridge.exposeInMainWorld('flmanager', {
  listFolders: () => ipcRenderer.invoke('folders:list'),
  addFolders: () => ipcRenderer.invoke('folders:add'),
  removeFolder: (folderPath) => ipcRenderer.invoke('folders:remove', folderPath),
  dataPath: () => ipcRenderer.invoke('app:dataPath'),
});
