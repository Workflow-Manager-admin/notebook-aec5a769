import React, { useState, useRef, useEffect } from 'react';
import './NoteEditor.css';

/**
 * PUBLIC_INTERFACE
 * @component NoteEditor
 * Rich text note editor with title input. Supports updating note content/metadata.
 * 
 * Props:
 *   - note: {id, title, content, metadata}
 *   - onSave: function(updatedValues) called on save (not auto-save)
 *   - onDelete: function() for delete
 *   - onChange: function({title, content, metadata}) called on edit
 *   - editable: bool (if false, view-only)
 *   - settings: object
 */
export default function NoteEditor({ note, onSave, onDelete, onChange, editable=true, settings={} }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [metadata, setMetadata] = useState(note?.metadata || {});
  const editorRef = useRef(null);

  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
    setMetadata(note?.metadata || {});
  }, [note]);

  // PUBLIC_INTERFACE
  // Handles formatting (wraps selected text)
  function applyFormat(tag, value) {
    document.execCommand(tag, false, value);
    if (onChange) onChange({ title, content: editorRef.current.innerHTML, metadata });
  }
  // PUBLIC_INTERFACE
  // Handle content/direct input
  function handleInput(e) {
    setContent(editorRef.current.innerHTML);
    if (onChange) onChange({ title, content: editorRef.current.innerHTML, metadata });
  }

  return (
    <section className="note-editor">
      {editable ? (
        <input
          type="text"
          value={title}
          maxLength={64}
          placeholder="Title"
          onChange={e => {
            setTitle(e.target.value);
            onChange && onChange({ title: e.target.value, content, metadata });
          }}
          aria-label="Note title"
        />
      ) : (
        <h2 aria-label="Note title">{title}</h2>
      )}
      <div className="editor-toolbar" aria-label="Text formatting">
        <button aria-label="Bold" onMouseDown={e => { e.preventDefault(); applyFormat('bold'); }}>B</button>
        <button aria-label="Italic" onMouseDown={e => { e.preventDefault(); applyFormat('italic'); }}>I</button>
        <button aria-label="Underline" onMouseDown={e => { e.preventDefault(); applyFormat('underline'); }}>U</button>
        <button aria-label="Bullet List" onMouseDown={e => { e.preventDefault(); applyFormat('insertUnorderedList'); }}>• List</button>
        <button aria-label="Numbered List" onMouseDown={e => { e.preventDefault(); applyFormat('insertOrderedList'); }}>1. List</button>
        <button aria-label="Undo" onMouseDown={e => { e.preventDefault(); applyFormat('undo'); }}>↺</button>
        <button aria-label="Redo" onMouseDown={e => { e.preventDefault(); applyFormat('redo'); }}>↻</button>
      </div>
      <div
        className="editor-content"
        ref={editorRef}
        contentEditable={editable}
        onInput={handleInput}
        suppressContentEditableWarning
        tabIndex={0}
        aria-label="Note content"
        dangerouslySetInnerHTML={{ __html: content }}
        spellCheck={settings.spellCheck ?? true}
        role="textbox"
        style={{ minHeight: 180, background: editable ? "#fff" : "#f2f2f7" }}
      />
      {editable && (
        <footer className="note-actions">
          <button onClick={() => onSave && onSave({ title, content, metadata })} className="btn btn-save">Save</button>
          <button onClick={onDelete} className="btn btn-delete">Delete</button>
        </footer>
      )}
      {/* Show metadata */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="note-metadata">
          <b>Tags:</b> {(metadata.tags || []).join(', ')}
        </div>
      )}
    </section>
  );
}
