/*
  PUBLIC_INTERFACE
  NoteEditor: Main area for editing/creating a note. Supports rich text and version history.
*/
import React, { useEffect, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import {
  getNote,
  updateNote,
  createNote,
  getFolders,
  createFolder,
  getNoteVersions,
  restoreNoteVersion
} from "../api";

export default function NoteEditor({
  noteId,
  onSaved,
  onDeleted,
  refreshTrigger
}) {
  const [note, setNote] = useState(null);
  const [folders, setFolders] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setTitle("");
      setContent("");
      setFolderId(null);
      setShowVersions(false);
      setVersions([]);
      return;
    }
    getNote(noteId).then(n => {
      setNote(n);
      setTitle(n.title);
      setContent(n.content);
      setFolderId(n.folder_id);
    });
    getNoteVersions(noteId).then(setVersions);
  }, [noteId, refreshTrigger]);

  useEffect(() => {
    getFolders().then(setFolders);
  }, [refreshTrigger]);

  const handleSave = () => {
    if (!title.trim()) return;
    const fn = note ? updateNote : createNote;
    fn(note ? note.id : undefined, { title, content, folder_id: folderId })
      .then(n => {
        setNote(n);
        if (onSaved) onSaved();
      });
  };

  const handleFolderChange = e => {
    if (e.target.value === "__create__") {
      let folder = prompt("Folder name?");
      if (folder)
        createFolder(folder).then(folders => {
          setFolders(folders);
          let match = folders.find(f => f.name === folder);
          setFolderId(match?.id);
        });
    } else {
      setFolderId(e.target.value || null);
    }
  };

  const handleRestoreVersion = vid => {
    if (!window.confirm("Restore to this previous version? This cannot be undone.")) return;
    restoreNoteVersion(noteId, vid).then(() => {
      if (onSaved) onSaved();
      getNote(noteId).then(n => {
        setNote(n);
        setTitle(n.title);
        setContent(n.content);
      });
      getNoteVersions(noteId).then(setVersions);
    });
  };

  if (!noteId && !note) {
    return <div className="editor-empty" style={{ color: "#888", padding: "2em" }}>Select a note to view or edit, or click <b>New Note</b> to add one.</div>;
  }

  return (
    <main className="editor" aria-label="Note Editor" tabIndex={0}>
      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title"
          aria-label="Note title"
          className="editor-title"
        />
        <select value={folderId || ""} onChange={handleFolderChange} aria-label="Folder">
          <option value="">No folder</option>
          {folders.map(f => (
            <option value={f.id} key={f.id}>{f.name}</option>
          ))}
          <option value="__create__">+ New folder…</option>
        </select>
        <button className="btn btn-success" aria-label="Save note" onClick={handleSave}>
          💾 Save
        </button>
      </div>
      <RichTextEditor value={content} onChange={setContent} />
      <div style={{ marginTop: "1em" }}>
        <button
          className="btn"
          onClick={() => setShowVersions(v => !v)}
          aria-expanded={showVersions}
          aria-controls="note-versions"
        >
          {showVersions ? "Hide" : "Show"} version history
        </button>
        {showVersions && versions.length > 1 && (
          <div id="note-versions" className="versions-list" style={{ marginTop: "1em" }}>
            <b>Past Versions:</b>
            <ul>
              {versions.map(v => (
                <li key={v.version_id}>
                  <span style={{ fontSize: "0.92em" }}>
                    Version {v.version_number} – {new Date(v.saved_at).toLocaleString()}
                  </span>
                  <button
                    className="btn btn-small"
                    onClick={() => handleRestoreVersion(v.version_id)}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
