const list = document.getElementById('folder-list');
const addButton = document.getElementById('add-folders');
const dataPath = document.getElementById('data-path');

function render(folders) {
  list.replaceChildren();

  if (folders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No folders yet. Add the places where your .flp files live.';
    list.append(empty);
    return;
  }

  for (const folder of folders) {
    const row = document.createElement('article');
    row.className = 'folder';

    const pathEl = document.createElement('p');
    pathEl.className = 'path';
    pathEl.textContent = folder.path;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'text';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => run(() => window.flmanager.removeFolder(folder.path)));

    row.append(pathEl, remove);
    list.append(row);
  }
}

function showError(error) {
  list.replaceChildren();
  const message = document.createElement('p');
  message.className = 'empty';
  message.textContent = `Something went wrong. ${error.message}`;
  list.append(message);
}

async function run(action) {
  try {
    render(await action());
  } catch (error) {
    showError(error);
  }
}

addButton.addEventListener('click', () => run(() => window.flmanager.addFolders()));

run(() => window.flmanager.listFolders());

window.flmanager.dataPath().then((dir) => {
  dataPath.textContent = `Folder list saved in ${dir}. Nothing is written into the folders you add.`;
}).catch((error) => {
  dataPath.textContent = error.message;
});
