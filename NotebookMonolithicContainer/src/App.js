import React, { useEffect, useState } from "react";
import "./App.css";
import "./components/NoteEditor.css";
import "./components/NoteList.css";
import "./components/FolderSidebar.css";
import "./components/SearchBar.css";
import "./components/NotificationBanner.css";
import "./components/SettingsPanel.css";
import NoteEditor from "./components/NoteEditor";
import NoteList from "./components/NoteList";
import FolderSidebar from "./components/FolderSidebar";
import SearchBar from "./components/SearchBar";
import NotificationBanner from "./components/NotificationBanner";
import SettingsPanel from "./components/SettingsPanel";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000/api";

function fetchAPI(endpoint, opts = {}) {
  return fetch(API_BASE + endpoint, {
    credentials: "same-origin",
    headers: {
      ...((opts.body && typeof opts.body === "object")
        ? { "Content-Type": "application/json" }
        : {}),
      ...opts.headers,
    },
    ...opts,
    body: opts.body && typeof opts.body === "object"
      ? JSON.stringify(opts.body)
      : opts.body,
  }).then((r) => r.json());
}

//
/**
 * PUBLIC_INTERFACE
 * App -- Unified Notebook Frontend
 * Main layout and logic.
 */
function App() {
  // State
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [versionList, setVersionList] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Fetch notes/folders/settings on load/folder/search change
  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line
  }, [selectedFolder, search]);
  useEffect(() => {
    fetchAPI("/folders").then(setFolders);
    fetchAPI("/settings").then(
      (rows) => setSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])))
    );
    fetchAPI("/notifications").then(setNotifications);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Theme handling
    document.documentElement.setAttribute(
      "data-theme",
      settings.theme === "true" || settings.theme === true
        ? "dark"
        : "light"
    );
    if (settings.font) {
      document.documentElement.style.fontFamily = settings.font;
    }
  }, [settings]);

  function loadNotes() {
    let url =
      "/notes?includeDeleted=false" +
      (selectedFolder ? "&folder_id=" + selectedFolder : "") +
      (search ? "&search=" + encodeURIComponent(search) : "");
    fetchAPI(url).then((data) => setNotes(
      (data || []).map(n => ({ ...n, metadata: typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata }))
    ));
  }

  const selectedNote =
    notes.find((n) => n.id === selectedNoteId) || null;

  // Note CRUD
  function handleSelectNote(id) {
    setSelectedNoteId(id);
    setShowVersionHistory(false);
    if (id == null) setVersionList([]);
  }
  function handleNoteSave(updated) {
    if (!selectedNote) return;
    fetchAPI(`/notes/${selectedNote.id}`, {
      method: "PUT",
      body: { ...selectedNote, ...updated },
    }).then((r) => {
      notify("Note saved!", "success");
      loadNotes();
    });
  }
  function handleNoteDelete() {
    if (!selectedNote) return;
    fetchAPI(`/notes/${selectedNote.id}`, { method: "DELETE" }).then(() => {
      notify("Note deleted.", "info");
      setSelectedNoteId(null);
      loadNotes();
    });
  }

  // Create new note
  function handleCreateNote() {
    fetchAPI("/notes", {
      method: "POST",
      body: {
        title: "Untitled Note",
        content: "",
        folder_id: selectedFolder,
        metadata: {},
      },
    }).then((data) => {
      notify("Note created!", "success");
      setSelectedNoteId(data.id);
      loadNotes();
    });
  }

  // Folders
  function handleAddFolder(name) {
    fetchAPI("/folders", {
      method: "POST",
      body: { name },
    }).then(() => {
      notify("Folder added.", "success");
      fetchAPI("/folders").then(setFolders);
    });
  }
  function handleDeleteFolder(id) {
    fetchAPI(`/folders/${id}`, { method: "DELETE" }).then(() => {
      notify("Folder deleted.", "info");
      fetchAPI("/folders").then(setFolders);
      loadNotes();
    });
  }

  // Move note to folder
  function handleMoveNote(noteId, folderId) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    fetchAPI(`/notes/${noteId}`, {
      method: "PUT",
      body: { ...note, folder_id: folderId },
    }).then(() => {
      notify("Note moved.", "info");
      loadNotes();
    });
  }

  // Bulk operations (delete all in folder)
  function handleDeleteSelectedNotes(ids) {
    fetchAPI(`/notes/bulk`, {
      method: "PUT",
      body: { ids, field: "is_deleted", value: 1 },
    }).then(() => {
      notify("Notes deleted.", "info");
      setSelectedNoteId(null);
      loadNotes();
    });
  }

  // Search bar
  function handleSearch(q) {
    setSearch(q);
    loadNotes();
  }

  // Settings
  function handleChangeSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }
  function handleSaveSettings(updated) {
    Object.entries(updated).forEach(([k, v]) => {
      fetchAPI("/settings", {
        method: "PUT",
        body: { key: k, value: v },
      });
    });
    notify("Settings saved.", "success");
  }

  // Notifications logic
  function notify(msg, type = "info") {
    setNotifications((prev) => [
      ...prev.slice(-19),
      { id: Math.random().toString(), msg, type, ts: Date.now() },
    ]);
    // Backend notification
    fetchAPI("/notifications");
  }
  function handleClearNotifications() {
    setNotifications([]);
    fetchAPI("/notifications", { method: "DELETE" });
  }

  // Export notes (download)
  function handleExport() {
    setShowExport(true);
    window.open(API_BASE + "/export", "_blank");
  }
  // Import notes
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("import_file", file);
    fetch(API_BASE + "/import", {
      method: "POST",
      body: fd,
    })
      .then((r) => r.json())
      .then(() => {
        notify("Import complete!", "success");
        setImporting(false);
        loadNotes();
      })
      .catch(() => {
        notify("Import failed.", "error");
        setImporting(false);
      });
  }

  // Version History
  function handleShowVersions() {
    if (!selectedNote) return;
    fetchAPI(`/notes/${selectedNote.id}/versions`).then((lst) => {
      setVersionList(lst);
      setShowVersionHistory(true);
    });
  }
  function handleRestoreVersion(v) {
    if (!selectedNote) return;
    fetchAPI(`/notes/${selectedNote.id}/restore/${v.version}`, { method: "POST" }).then(() => {
      notify("Version restored!", "success");
      loadNotes();
      setShowVersionHistory(false);
    });
  }

  // Keyboard Accessibility: Ctrl+Alt+N for new note, Ctrl+Alt+F for find
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey) {
        if (e.key === "n") {
          handleCreateNote();
          e.preventDefault();
        }
        if (e.key === "f") {
          document.getElementById("search-bar-main")?.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, []);

  // Layout
  return (
    <div className="App">
      <header className="App-header" style={{ minHeight: 80, marginBottom: 0, padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0.4em 1.5em" }}>
          <h1 style={{ fontSize: "1.6em", fontWeight: 700, margin: 0 }}>
            📝 NoteBook
          </h1>
          <button
            className="theme-toggle"
            onClick={() =>
              setSettings((s) => ({
                ...s,
                theme: (s.theme === "true" || s.theme === true) ? false : true,
              }))
            }
            aria-label={`Switch to ${(settings.theme === "true" || settings.theme === true) ? 'light' : 'dark'} mode`}
            style={{ marginLeft: "auto" }}
          >
            {(settings.theme === "true" || settings.theme === true) ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>
      <main style={{ display: "flex", minHeight: "88vh" }}>
        <FolderSidebar
          folders={folders}
          selected={selectedFolder}
          onSelect={id => { setSelectedFolder(id); setSelectedNoteId(null); }}
          onAdd={handleAddFolder}
          onDelete={handleDeleteFolder}
        />
        <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <NotificationBanner notifications={notifications} onClear={handleClearNotifications} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 0 0" }}>
            <SearchBar
              value={search}
              onValueChange={setSearch}
              onSearch={handleSearch}
              id="search-bar-main"
            />
            <button
              style={{ marginLeft: 7 }}
              onClick={handleCreateNote}
              className="btn"
              aria-label="Create new note"
            >+ Note</button>
            <button
              style={{ marginLeft: 7 }}
              onClick={() => setShowSettings(x => !x)}
              className="btn"
              aria-label="Settings"
            >⚙️</button>
            <button
              style={{ marginLeft: 7 }}
              onClick={handleExport}
              className="btn"
              aria-label="Export notes"
            >⭳ Export</button>
            <button
              style={{ marginLeft: 7 }}
              className="btn"
              aria-label="Import notes"
              onClick={() => setShowImport(v => !v)}
            >⭱ Import</button>
            {selectedNote && (
              <button
                style={{ marginLeft: 7 }}
                className="btn"
                aria-label="Show version history"
                onClick={handleShowVersions}
              >⏳ Versions</button>
            )}
          </div>
          {showSettings && (
            <SettingsPanel
              settings={settings}
              onChange={handleChangeSetting}
              onSave={handleSaveSettings}
            />
          )}
          {showImport && (
            <div style={{
              background: "#f9f2fc", padding: "1em", borderRadius: 7,
              margin: "1em 0", maxWidth: 400
            }}>
              <input type="file" accept="application/json"
                onChange={handleImportFile}
                disabled={importing}
              />
              {importing && <span style={{ marginLeft: 7 }}>Importing...</span>}
              <button onClick={() => setShowImport(false)} style={{ marginLeft: 12 }}>Cancel</button>
            </div>
          )}
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <div style={{ width: 350, maxWidth: "40vw", minHeight: 0 }}>
              <NoteList
                notes={notes}
                onSelect={handleSelectNote}
                selectedId={selectedNoteId}
                onDelete={(id) => handleDeleteSelectedNotes([id])}
                folders={folders}
                onMove={handleMoveNote}
                metadataDisplay={true}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedNote ? (
                <>
                  <NoteEditor
                    note={selectedNote}
                    onSave={handleNoteSave}
                    onDelete={handleNoteDelete}
                    onChange={v => { /* Optional live change logic here */ }}
                    editable={true}
                    settings={settings}
                  />
                  {showVersionHistory && versionList.length > 0 && (
                    <aside style={{
                      background: "#fefeff",
                      border: "1px solid #caabf7",
                      borderRadius: 8,
                      margin: "2em auto 0 auto",
                      padding: "1.2em 1.8em",
                      maxWidth: 600
                    }}>
                      <h4>Version History</h4>
                      <ul>
                        {versionList.map(v => (
                          <li key={v.version} style={{ margin: "6px 0" }}>
                            <b>v{v.version}</b> @ {v.updated_at && new Date(v.updated_at).toLocaleString()}&nbsp;
                            <button style={{ marginLeft: 8, fontSize: 13 }}
                              onClick={() => handleRestoreVersion(v)}
                              aria-label="Restore version"
                            >Restore</button>
                          </li>
                        ))}
                      </ul>
                      <button style={{ marginTop: 9 }} onClick={() => setShowVersionHistory(false)}>Close</button>
                    </aside>
                  )}
                </>
              ) : (
                <div style={{
                  color: "#7970a4",
                  margin: "3em auto",
                  textAlign: "center"
                }}>
                  <span>Select a note or create one to get started!</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer style={{ margin: 30, textAlign: "center", color: "#aaa" }}>
        &copy; {new Date().getFullYear()} Kavia Notes App.
        &nbsp;|&nbsp;
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </footer>
    </div>
  );
}

export default App;
