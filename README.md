# FL Manager

A read-only desktop library for FL Studio projects. Tags, ratings, notes, and the folder list live in a SQLite file in the app's own data folder. The app does not modify `.flp` files or anything next to them.

## PyFLP check

Uses the virtualenv in `.venv` (Python 3.9, PyFLP 2.2.1). Point it at a **copy** of a project:

```bash
.venv/bin/python parser/parse_flp.py "/path/to/copy.flp"
```

On Windows the interpreter is `.venv\Scripts\python`.

## Run the app

Electron's installer needs Node 22.12 or newer. This repo pins 22.14.0, which is already available through nvm:

```bash
nvm use
npm install
npm start
```

`npm test` checks that saving a folder, and reading an `.flp`, leaves that folder unchanged.
