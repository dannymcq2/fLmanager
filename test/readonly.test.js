const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, listFolders, addFolders, removeFolder } = require('../db');

// Fails if app code creates or changes anything inside a folder the user picked.
function snapshot(dir) {
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files.push(`${full}\0${fs.readFileSync(full).toString('base64')}`);
      }
    }
  }

  walk(dir);
  files.sort();
  return files;
}

function venvPython() {
  const root = path.join(__dirname, '..');
  const candidates = [
    path.join(root, '.venv', 'Scripts', 'python.exe'),
    path.join(root, '.venv', 'bin', 'python'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(found, 'Expected .venv from the PyFLP setup');
  return found;
}

test('saving or removing a library folder does not write inside it', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flmanager-'));
  const library = path.join(root, 'projects');
  const nested = path.join(library, 'trap');
  const dataDir = path.join(root, 'appdata');
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(nested, 'song.flp'), 'not a real flp');
  const before = snapshot(library);

  const dbPath = path.join(dataDir, 'flmanager.db');
  const db = openDatabase(dbPath);
  try {
    const added = addFolders(db, [library]);
    assert.deepEqual(snapshot(library), before);
    assert.equal(added.length, 1);
    assert.equal(added[0].path, library);
    assert.equal(fs.existsSync(dbPath), true);
    assert.equal(dbPath.startsWith(library + path.sep), false);

    const again = addFolders(db, [library]);
    assert.equal(again.length, 1);
    assert.deepEqual(snapshot(library), before);

    assert.deepEqual(removeFolder(db, library), []);
    assert.deepEqual(snapshot(library), before);
    assert.deepEqual(listFolders(db), []);
  } finally {
    db.close();
  }
});

test('the flp reader does not write into the folder that holds the file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flmanager-parse-'));
  const library = path.join(root, 'projects');
  fs.mkdirSync(library);
  const flp = path.join(library, 'song.flp');
  fs.writeFileSync(flp, 'not a real flp');
  fs.writeFileSync(path.join(library, 'notes.txt'), 'leave me alone');
  const before = snapshot(library);

  const result = spawnSync(venvPython(), [path.join(__dirname, '..', 'parser', 'parse_flp.py'), flp], {
    encoding: 'utf8',
  });

  assert.deepEqual(snapshot(library), before);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.file, flp);
  assert.equal(typeof parsed.error, 'string');
  assert.notEqual(parsed.error, null);
});
