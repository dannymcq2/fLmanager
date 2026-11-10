const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// SQLite ships with Electron's Node, so there is no native addon to compile.
// main.js opens this file inside the app data directory, never in a project folder.

function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS library_folders (
      path TEXT PRIMARY KEY,
      added_at TEXT NOT NULL
    )
  `);
  return db;
}

function listFolders(db) {
  return db
    .prepare('SELECT path, added_at AS addedAt FROM library_folders ORDER BY added_at, path')
    .all();
}

function addFolders(db, folderPaths) {
  const insert = db.prepare(`
    INSERT INTO library_folders (path, added_at)
    VALUES (?, ?)
    ON CONFLICT(path) DO NOTHING
  `);
  const addedAt = new Date().toISOString();
  for (const folderPath of folderPaths) {
    insert.run(normalizeFolder(folderPath), addedAt);
  }
  return listFolders(db);
}

function removeFolder(db, folderPath) {
  db.prepare('DELETE FROM library_folders WHERE path = ?').run(normalizeFolder(folderPath));
  return listFolders(db);
}

function normalizeFolder(folderPath) {
  if (typeof folderPath !== 'string' || folderPath.trim() === '') {
    throw new Error('Folder path must be a non-empty string');
  }
  return path.resolve(folderPath);
}

module.exports = { openDatabase, listFolders, addFolders, removeFolder };
