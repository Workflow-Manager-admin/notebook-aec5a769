import React, { useState } from 'react';
import './FolderSidebar.css';

/**
 * PUBLIC_INTERFACE
 * @component FolderSidebar
 * @description Shows folders/categories. Supports create/delete/select.
 * Props:
 *   - folders: array of {id, name}
 *   - selected: id
 *   - onSelect: function(folderId)
 *   - onAdd: function(name)
 *   - onDelete: function(folderId)
 */
export default function FolderSidebar({ folders, selected, onSelect, onAdd, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [folderName, setFolderName] = useState('');

  function handleCreate() {
    if (folderName.trim()) {
      onAdd(folderName.trim());
      setFolderName('');
      setAdding(false);
    }
  }
  return (
    <nav className="folder-sidebar" aria-label="Folders">
      <h3>Folders</h3>
      <ul className="folders-list">
        <li
          className={!selected ? 'active' : ''}
          tabIndex={0}
          aria-label="All notes"
          onClick={() => onSelect(null)}
        >
          All Notes
        </li>
        {folders.map(f => (
          <li
            key={f.id}
            className={selected === f.id ? 'active' : ''}
            tabIndex={0}
            aria-label={`Folder: ${f.name}`}
            onClick={() => onSelect(f.id)}
          >
            {f.name}
            <button
              aria-label={`Delete folder ${f.name}`}
              className="delete-folder-btn"
              onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {adding ? (
        <div className="add-folder-form">
          <input
            type="text"
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            aria-label="Folder name"
            maxLength={24}
            autoFocus
          />
          <button onClick={handleCreate}>Add</button>
          <button onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="add-folder-btn" aria-label="Add folder">+ Add Folder</button>
      )}
    </nav>
  );
}
