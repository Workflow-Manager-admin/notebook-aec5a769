//
// Express.js backend for NotebookMonolithicContainer
// Provides REST API for notes, folders, settings, notifications, versioning.
//
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;

const DB_FILE = path.resolve(__dirname, 'notebook.sqlite');
const PORT = process.env.NOTEBOOK_BACKEND_PORT || 4001;

let db;
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Folder/category schema: id, name, created_at
// Note schema: id, title, content, folder_id, created_at, updated_at, metadata, is_deleted
// NoteVersion: version_id, note_id, version_number, content, saved_at
// Notification: id, message, type, created_at, read
// Settings: key, value

// --- Initialization ---
async function initDb() {
  db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  await db.run(`
    CREATE TABLE IF NOT EXISTS folder (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      folder_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(folder_id) REFERENCES folder(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS note_version (
      version_id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER,
      version_number INTEGER,
      content TEXT,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(note_id) REFERENCES note(id)
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS notification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read INTEGER DEFAULT 0
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

// --- Folders ---
/**
 * Get all folders/categories.
 */
app.get('/api/folders', async (req, res) => {
  const rows = await db.all('SELECT * FROM folder ORDER BY LOWER(name)');
  res.json(rows);
});

/**
 * Create new folder.
 */
app.post('/api/folders', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing folder name.' });
  await db.run('INSERT INTO folder (name) VALUES (?)', [name]);
  const folders = await db.all('SELECT * FROM folder ORDER BY LOWER(name)');
  res.json(folders);
});

/**
 * Delete folder and optionally soft-delete notes within it.
 */
app.delete('/api/folders/:id', async (req, res) => {
  const id = req.params.id;
  await db.run('UPDATE note SET is_deleted=1 WHERE folder_id=?', [id]);
  await db.run('DELETE FROM folder WHERE id=?', [id]);
  res.json({ success: true });
});

// --- Notes ---
/**
 * Get all notes, optionally filter by folder, search, etc.
 * Query params: folderId, q, trash
 */
app.get('/api/notes', async (req, res) => {
  let { folderId, q, trash } = req.query;
  let sql = 'SELECT * FROM note WHERE 1=1';
  let args = [];
  if (folderId) {
    sql += ' AND folder_id=?';
    args.push(folderId);
  }
  if (q) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    args.push(`%${q}%`, `%${q}%`);
  }
  if (!trash) {
    sql += ' AND is_deleted=0';
  } else if (trash === '1' || trash === 'true') {
    sql += ' AND is_deleted=1';
  }
  sql += ' ORDER BY updated_at DESC';
  const notes = await db.all(sql, args);
  res.json(notes);
});

/**
 * Get a single note.
 */
app.get('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  const note = await db.get('SELECT * FROM note WHERE id=?', id);
  if (!note) return res.status(404).json({ error: 'Not found.' });
  res.json(note);
});

/**
 * Create a note.
 */
app.post('/api/notes', async (req, res) => {
  const { title, content, folder_id, metadata } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing title.' });
  const now = new Date().toISOString();
  const result = await db.run('INSERT INTO note (title, content, folder_id, created_at, updated_at, metadata) VALUES (?,?,?,?,?,?)', [title, content || '', folder_id || null, now, now, metadata ? JSON.stringify(metadata) : null]);
  const noteId = result.lastID;
  await db.run('INSERT INTO note_version (note_id, version_number, content) VALUES (?, 1, ?)', [noteId, content || '']);
  res.json(await db.get('SELECT * FROM note WHERE id=?', noteId));
});

/**
 * Edit a note; also creates a version.
 */
app.put('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  const note = await db.get('SELECT * FROM note WHERE id=?', id);
  if (!note) return res.status(404).json({ error: 'Not found.' });
  const { title, content, folder_id, metadata } = req.body;
  const now = new Date().toISOString();
  await db.run(
    'UPDATE note SET title=?, content=?, folder_id=?, updated_at=?, metadata=? WHERE id=?',
    [title || note.title, content ?? note.content, folder_id ?? note.folder_id, now, metadata ? JSON.stringify(metadata) : note.metadata, id]
  );
  // Add to version history
  const row = await db.get('SELECT MAX(version_number) as vn FROM note_version WHERE note_id=?', id);
  const nextVersion = ((row && row.vn) || 0) + 1;
  await db.run('INSERT INTO note_version (note_id, version_number, content) VALUES (?, ?, ?)', [id, nextVersion, content]);
  res.json(await db.get('SELECT * FROM note WHERE id=?', id));
});

/**
 * Soft delete a note (move to trash).
 */
app.delete('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  await db.run('UPDATE note SET is_deleted=1 WHERE id=?', id);
  res.json({ success: true });
});

/**
 * Permanently delete note.
 */
app.delete('/api/notes/:id/permanent', async (req, res) => {
  const id = req.params.id;
  await db.run('DELETE FROM note WHERE id=?', id);
  await db.run('DELETE FROM note_version WHERE note_id=?', id);
  res.json({ success: true });
});

/**
 * Bulk delete/restore (expects {noteIds: [], action: "delete"|"restore"})
 */
app.post('/api/notes/bulk', async (req, res) => {
  const { noteIds, action } = req.body;
  if (!Array.isArray(noteIds) || !action) return res.status(400).json({ error: 'Invalid.' });
  if (action === 'delete') {
    await db.run(
      `UPDATE note SET is_deleted=1 WHERE id IN (${noteIds.map(() => '?').join(',')})`,
      noteIds
    );
  } else if (action === 'restore') {
    await db.run(
      `UPDATE note SET is_deleted=0 WHERE id IN (${noteIds.map(() => '?').join(',')})`,
      noteIds
    );
  }
  res.json({ success: true });
});

/**
 * Restore a note from trash.
 */
app.post('/api/notes/:id/restore', async (req, res) => {
  const id = req.params.id;
  await db.run('UPDATE note SET is_deleted=0 WHERE id=?', id);
  res.json({ success: true });
});

// --- Note Version History ---
/**
 * Get versions for a note.
 */
app.get('/api/notes/:id/versions', async (req, res) => {
  const rows = await db.all(
    'SELECT version_id, version_number, content, saved_at FROM note_version WHERE note_id=? ORDER BY version_number DESC',
    req.params.id
  );
  res.json(rows);
});

/**
 * Restore a previous version for a note.
 */
app.post('/api/notes/:id/restore-version', async (req, res) => {
  const { version_id } = req.body;
  if (!version_id) return res.status(400).json({ error: 'Missing version_id.' });
  const version = await db.get('SELECT content FROM note_version WHERE version_id=?', version_id);
  if (!version) return res.status(404).json({ error: 'Not found.' });
  await db.run('UPDATE note SET content=?, updated_at=? WHERE id=?', [version.content, new Date().toISOString(), req.params.id]);
  res.json({ success: true });
});

// --- Notes: Export/Import ---
/**
 * EXPORT all notes/folders/settings.
 */
app.get('/api/export', async (req, res) => {
  const folders = await db.all('SELECT * FROM folder');
  const notes = await db.all('SELECT * FROM note');
  const noteVersions = await db.all('SELECT * FROM note_version');
  const settings = await db.all('SELECT * FROM settings');
  res.setHeader('Content-Disposition', 'attachment;filename=notebook_export.json');
  res.json({ folders, notes, noteVersions, settings });
});

/**
 * IMPORT notes/folders/settings.
 */
app.post('/api/import', async (req, res) => {
  try {
    const { folders, notes, noteVersions, settings } = req.body;
    if (folders) {
      for (const f of folders) {
        await db.run('INSERT OR IGNORE INTO folder (id, name, created_at) VALUES (?, ?, ?)', [f.id, f.name, f.created_at]);
      }
    }
    if (notes) {
      for (const n of notes) {
        await db.run('INSERT OR IGNORE INTO note (id, title, content, folder_id, created_at, updated_at, metadata, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
          n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at, n.metadata, n.is_deleted
        ]);
      }
    }
    if (noteVersions) {
      for (const v of noteVersions) {
        await db.run('INSERT OR IGNORE INTO note_version (version_id, note_id, version_number, content, saved_at) VALUES (?, ?, ?, ?, ?)', [
          v.version_id, v.note_id, v.version_number, v.content, v.saved_at
        ]);
      }
    }
    if (settings) {
      for (const s of settings) {
        await db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [
          s.key, s.value
        ]);
      }
    }
    res.json({ success: true, message: 'Import completed.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Settings ---
/**
 * Get all settings (K/V).
 */
app.get('/api/settings', async (req, res) => {
  const rows = await db.all('SELECT * FROM settings');
  res.json(rows);
});

/**
 * Update/add setting.
 */
app.post('/api/settings', async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key.' });
  await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  res.json({ success: true });
});

// --- Notifications ---
/**
 * List notifications.
 */
app.get('/api/notifications', async (req, res) => {
  const rows = await db.all('SELECT * FROM notification ORDER BY created_at DESC');
  res.json(rows);
});

/**
 * Add notification.
 */
app.post('/api/notifications', async (req, res) => {
  const { message, type } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message.' });
  await db.run('INSERT INTO notification (message, type) VALUES (?, ?)', [message, type || 'info']);
  res.json({ success: true });
});

/**
 * Mark notification as read.
 */
app.post('/api/notifications/:id/read', async (req, res) => {
  await db.run('UPDATE notification SET read=1 WHERE id=?', req.params.id);
  res.json({ success: true });
});

// --- Serve React frontend ---
const frontendBuild = path.resolve(__dirname, '../build');
if (process.env.NODE_ENV === 'production' && fs.stat(frontendBuild).catch(() => false)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// --- Start Server ---
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Notebook backend listening on port ${PORT}`);
  });
}).catch((e) => {
  console.error('Could not initialize DB', e);
  process.exit(1);
});
