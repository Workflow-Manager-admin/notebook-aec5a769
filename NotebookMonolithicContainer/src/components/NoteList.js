/*
  PUBLIC_INTERFACE
  NoteList: Displays a list of notes and folders, with search/filter, folder nav, bulk ops, and accessibility
*/

import React, { useEffect, useState } from "react";
import {
  getNotes,
  getFolders,
  deleteNote,
  restoreNote,
  bulkNoteAction,
  deleteFolder
} from "../api";

export default function NoteList({
  selectedNoteId,
  onSelectNote,
  onNewNote,
  onEditNote,
  onDeletedNotesView,
  filterText,
  onSearch,
  onBulkSelecting,
  bulkSelectIds,
  setBulkSelectIds,
  refreshTrigger
}) {
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    getFolders().then(setFolders);
  }, [refreshTrigger]);

  useEffect(() => {
    getNotes({
      folderId: selectedFolder,
      q: filterText,
      trash: showTrash ? 1 : 0
    }).then(setNotes);
    setBulkSelectIds && setBulkSelectIds([]);
  }, [selectedFolder, filterText, showTrash, refreshTrigger]);

  const toggleTrash = () => {
    setShowTrash(trash => !trash);
    setSelectedFolder(null);
    onDeletedNotesView && onDeletedNotesView();
  };

  const handleBulkToggle = id => {
    setBulkSelectIds(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  };

  const handleBulkDelete = () => {
    bulkNoteAction(bulkSelectIds, showTrash ? "restore" : "delete").then(() =>
      getNotes({
        folderId: selectedFolder,
        q: filterText,
        trash: showTrash ? 1 : 0
      }).then(setNotes)
    );
    setBulkSelectIds([]);
  };

  return (
    <aside className="sidebar" aria-label="Folders/Nav">
      <nav>
        <ul className="folders">
          <li
            className={!selectedFolder ? "active" : ""}
            tabIndex={0}
            onClick={() => setSelectedFolder(null)}
            aria-label="All Notes"
          >
            <span role="img" aria-label="notes">🗒️</span> All Notes
            <span style={{ float: "right" }}>
              {folders.reduce((acc, f) => acc + (f.name ? 1 : 0), 0)}
            </span>
          </li>
          {folders.map(f => (
            <li
              key={f.id}
              className={selectedFolder === f.id ? "active" : ""}
              tabIndex={0}
              onClick={() => setSelectedFolder(f.id)}
              aria-label={`Folder ${f.name}`}
            >
              <span role="img" aria-label="folder">📁</span> {f.name}
              <button
                className="delete-folder-btn"
                aria-label="Delete folder"
                onClick={e => {
                  e.stopPropagation();
                  deleteFolder(f.id).then(() =>
                    setFolders(folders => folders.filter(ff => ff.id !== f.id))
                  );
                }}
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="note-list-toolbar" style={{ margin: "0.5em 0" }}>
        <button onClick={onNewNote} className="btn btn-primary">
          + New Note
        </button>
        <button
          onClick={toggleTrash}
          className="btn"
          aria-pressed={showTrash}
        >
          {showTrash ? "← Notes" : "🗑️ Trash"}
        </button>
        <input
          type="search"
          aria-label="Search notes"
          value={filterText}
          onChange={e => onSearch && onSearch(e.target.value)}
          placeholder="Search…"
          style={{ marginLeft: 8, borderRadius: 6, padding: "0.2em 0.4em" }}
        />
      </div>
      <ul className="notes" aria-label="Notes">
        {notes.map(note => (
          <li
            key={note.id}
            className={selectedNoteId === note.id ? "active" : ""}
            style={{ opacity: note.is_deleted ? 0.4 : 1 }}
          >
            {setBulkSelectIds && (
              <input
                type="checkbox"
                checked={bulkSelectIds?.includes(note.id)}
                onChange={() => handleBulkToggle(note.id)}
                aria-label="Select note for bulk action"
                tabIndex={0}
              />
            )}
            <span
              tabIndex={0}
              role="button"
              aria-label={`Select note ${note.title}`}
              onClick={() => onSelectNote(note.id)}
              style={{ fontWeight: note.is_deleted ? 400 : 700 }}
            >
              {note.title || <i>(Untitled)</i>}
            </span>
          </li>
        ))}
      </ul>
      {setBulkSelectIds && bulkSelectIds.length > 0 && (
        <button className="btn btn-danger" onClick={handleBulkDelete}>
          {showTrash ? "Restore" : "Delete"} selected ({bulkSelectIds.length})
        </button>
      )}
    </aside>
  );
}
