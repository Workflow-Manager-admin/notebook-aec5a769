import React from 'react';
import './NoteList.css';

/**
 * PUBLIC_INTERFACE
 * @component NoteList
 *
 * Props:
 *   - notes: array of {id, title, updated_at, ...}
 *   - onSelect: function(id) (select the note)
 *   - selectedId: string
 *   - onDelete: function(id)
 *   - folders: array (for categories display)
 *   - onMove: function(noteId, folderId)
 *   - metadataDisplay: boolean
 */
export default function NoteList({
  notes,
  onSelect,
  selectedId,
  onDelete,
  folders,
  onMove,
  metadataDisplay
}) {
  return (
    <div className="note-list" aria-label="Note list">
      {notes.length === 0 && (
        <div className="note-list-empty">No notes</div>
      )}
      {notes.map(note => (
        <div
          key={note.id}
          className={"note-list-item" + (selectedId === note.id ? " selected" : "")}
          tabIndex={0}
          aria-label={`Note: ${note.title}`}
          onClick={() => onSelect(note.id)}
        >
          <div className="note-title">{note.title || '(untitled)'}</div>
          <div className="note-updated-at">
            {note.updated_at ? new Date(note.updated_at).toLocaleString() : ''}
          </div>
          {metadataDisplay && note.metadata?.tags && note.metadata.tags.length > 0 && (
            <span className="note-tags">{note.metadata.tags.join(', ')}</span>
          )}
          <div className="note-list-controls">
            <button onClick={e => {e.stopPropagation(); onDelete(note.id);}} aria-label="Delete note">🗑</button>
            {folders && onMove && (
              <select value={note.folder_id || ""} onChange={e => onMove(note.id, e.target.value)}>
                <option value="">Uncategorized</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
