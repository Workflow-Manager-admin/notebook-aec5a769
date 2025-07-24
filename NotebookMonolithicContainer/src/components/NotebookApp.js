/*
  PUBLIC_INTERFACE
  Main NotebookApp UI composition: sidebar + main editor, appbar, responsive, accessibility
*/
import React, { useState, useEffect } from "react";
import NoteEditor from "./NoteEditor";
import NoteList from "./NoteList";
import NotificationsPanel from "./Notifications";
import SettingsPanel from "./Settings";
import { exportData, importData, addNotification } from "../api";
import "./NotebookApp.css";

export default function NotebookApp() {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bulkSelectIds, setBulkSelectIds] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const [importExportMsg, setImportExportMsg] = useState("");

  useEffect(() => {
    // load theme from settings on mount (for accessibility)
    const savedTheme =
      localStorage.getItem("theme") ||
      document.documentElement.getAttribute("data-theme") ||
      "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleExport = () => {
    exportData().then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "notebook_export.json";
      a.click();
      setImportExportMsg("Data exported!");
    });
  };

  const handleImport = async e => {
    const file = e.target.files[0];
    if (!file) return;
    let payload = null;
    try {
      const text = await file.text();
      payload = JSON.parse(text);
      await importData(payload);
      setRefreshTrigger(Date.now());
      setImportExportMsg("Import successful!");
      addNotification("Notebook imported.", "success");
    } catch (e) {
      setImportExportMsg("Failed to import: " + e.message);
    }
  };

  return (
    <div className="notebook-root" role="main">
      <header className="topbar" aria-label="Appbar">
        <h1 className="logo-title" tabIndex={0}>🗒️ Notebook</h1>
        <nav>
          <button className="btn" aria-label="Notifications" onClick={() => setShowNotifications(b => !b)}>
            🔔
          </button>
          <button className="btn" aria-label="Settings" onClick={() => setShowSettings(b => !b)}>
            ⚙️
          </button>
          <button className="btn" onClick={handleExport} aria-label="Export notes">
            ⬇ Export
          </button>
          <label htmlFor="import-notes-btn" className="btn" style={{ cursor: "pointer" }}>
            ⬆ Import
            <input
              type="file"
              id="import-notes-btn"
              style={{ display: "none" }}
              accept="application/json"
              onChange={handleImport}
            />
          </label>
          {importExportMsg && <span style={{ marginLeft: "1em", color: "#329c5e" }}>{importExportMsg}</span>}
        </nav>
      </header>
      <div className="notebook-body">
        <NoteList
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onNewNote={() => setSelectedNoteId(null)}
          filterText={filterText}
          onSearch={setFilterText}
          setBulkSelectIds={setBulkSelectIds}
          bulkSelectIds={bulkSelectIds}
          refreshTrigger={refreshTrigger}
        />
        <div className="main-panel" style={{ flex: 1 }}>
          <NoteEditor
            noteId={selectedNoteId}
            onSaved={() => setRefreshTrigger(Date.now())}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      <footer className="footer-bar" aria-label="Footer">
        <small>
          &copy; Notebook app | Powered by React, Express, SQLite
        </small>
      </footer>
    </div>
  );
}
