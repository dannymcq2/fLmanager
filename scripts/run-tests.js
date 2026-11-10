const path = require('path');
const { spawnSync } = require('child_process');

// Electron treats --test as its own flag, so the Node test runner cannot be
// started that way. This file relaunches itself inside Electron's Node
// (which has node:sqlite) and runs the tests from there.
if (!process.env.FLMANAGER_TEST_RUNNER) {
  const electron = require('electron');
  const result = spawnSync(electron, [__filename], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      FLMANAGER_TEST_RUNNER: '1',
    },
  });
  process.exit(result.status === null ? 1 : result.status);
}

const { run } = require('node:test');
const { spec } = require('node:test/reporters');

let failed = false;
const stream = run({
  files: [path.join(__dirname, '..', 'test', 'readonly.test.js')],
});

stream.on('test:fail', () => {
  failed = true;
});
stream.compose(spec).pipe(process.stdout);
stream.on('end', () => {
  process.exitCode = failed ? 1 : 0;
});
