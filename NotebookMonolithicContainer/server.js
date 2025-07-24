//
// Express.js + SQLite Monolithic Backend for Notebook Application
//
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATABASE_FILE = path.resolve(__dirname, 'notebook.sqlite');
const PORT = process.env.PORT || 4000; // Backend API runs on :4000

// Initialize DB if missing
function createDatabase(db) {
  db.serialize(() => {
    // Notes table
    db.run(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        folder_id TEXT,
        metadata TEXT,
        is_deleted INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1
      )`);
    // Folders table
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT
      )`);
    // Note versions table
    db.run(`
      CREATE TABLE IF NOT EXISTS note_versions (
        id TEXT,
        version INTEGER,
        title TEXT,
        content TEXT,
        updated_at TEXT,
        metadata TEXT,
        PRIMARY KEY (id, version)
      )`);
    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);
    // Simple notification log (in memory only, for demo)
  });
}

// DB Connection
const db = new sqlite3.Database(DATABASE_FILE);
createDatabase(db);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// For file uploads (import)
const upload = multer({ dest: path.resolve(__dirname, 'uploads/') });

//////////////////////////////////////
// PUBLIC_INTERFACE
// Health Check Endpoint
/**
 * @route GET /api/health
 * @summary Reports server health
 * @returns 200 OK with status {"status":"ok"}
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

//////////////////////////////////////
// Notes CRUD

// PUBLIC_INTERFACE
// Get all notes (with optional folder and search)
app.get('/api/notes', (req, res) => {
  // Query params: folder_id, search, includeDeleted (bool)
  const { folder_id, search, includeDeleted } = req.query;
  let q = `SELECT * FROM notes WHERE 1=1`;
  const args = [];
  if (folder_id && folder_id !== 'all') {
    q += ` AND folder_id = ?`;
    args.push(folder_id);
  }
  if (search) {
    q += ` AND (title LIKE ? OR content LIKE ?)`;
    args.push(`%${search}%`, `%${search}%`);
  }
  if (!includeDeleted) {
    q += ` AND is_deleted = 0`;
  }
  q += ` ORDER BY updated_at DESC`;
  db.all(q, args, (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    rows.forEach(row => { // Metadata as object
      row.metadata = row.metadata ? JSON.parse(row.metadata) : {};
    });
    res.json(rows);
  });
});

// PUBLIC_INTERFACE
// Get a note by ID
app.get('/api/notes/:id', (req, res) => {
  db.get(`SELECT * FROM notes WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: String(err) });
    if (!row) return res.status(404).json({ error: 'Note not found' });
    row.metadata = row.metadata ? JSON.parse(row.metadata) : {};
    res.json(row);
  });
});

// PUBLIC_INTERFACE
// Create a note
app.post('/api/notes', (req, res) => {
  const { title, content, folder_id, metadata } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`INSERT INTO notes (id, title, content, created_at, updated_at, folder_id, metadata, is_deleted, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1)`,
    [id, title, content || '', now, now, folder_id || null, JSON.stringify(metadata || {})],
    function (err) {
      if (err) return res.status(500).json({ error: String(err) });
      // Also create version 1
      db.run(`INSERT INTO note_versions (id, version, title, content, updated_at, metadata)
        VALUES (?, 1, ?, ?, ?, ?)`,
        [id, title, content || '', now, JSON.stringify(metadata || {})]);
      res.json({ id });
    });
});

// PUBLIC_INTERFACE
// Update a note (with versioning)
app.put('/api/notes/:id', (req, res) => {
  const { title, content, folder_id, metadata, is_deleted } = req.body;
  db.get(`SELECT * FROM notes WHERE id = ?`, [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Note not found' });
    const now = new Date().toISOString();
    const newVersion = (row.version || 1) + 1;
    db.run(
      `UPDATE notes 
         SET title=?, content=?, updated_at=?, folder_id=?, metadata=?, is_deleted=?, version=? 
       WHERE id=?`,
      [title, content, now, folder_id || null, JSON.stringify(metadata || {}), is_deleted ? 1 : 0, newVersion, req.params.id],
      function (err2) {
        if (err2) return res.status(500).json({ error: String(err2) });
        // Save versioned copy
        db.run(
          `INSERT INTO note_versions (id, version, title, content, updated_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [req.params.id, newVersion, title, content, now, JSON.stringify(metadata || {})]);
        res.json({ status: 'updated', version: newVersion });
      }
    );
  });
});

// PUBLIC_INTERFACE
// Delete a note (soft delete)
app.delete('/api/notes/:id', (req, res) => {
  db.run(`UPDATE notes SET is_deleted = 1 WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: String(err) });
    res.json({ status: 'deleted' });
  });
});

// PUBLIC_INTERFACE
// Get version history for a note
app.get('/api/notes/:id/versions', (req, res) => {
  db.all(`SELECT version, title, content, updated_at, metadata FROM note_versions WHERE id = ? ORDER BY version DESC`,
    [req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: String(err) });
      rows.forEach(row => row.metadata = row.metadata ? JSON.parse(row.metadata) : {});
      res.json(rows);
    });
});

// PUBLIC_INTERFACE
// Restore a note to a previous version
app.post('/api/notes/:id/restore/:version', (req, res) => {
  db.get(`SELECT * FROM note_versions WHERE id = ? AND version = ?`, [req.params.id, req.params.version], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Version not found' });
    const now = new Date().toISOString();
    db.run(
      `UPDATE notes SET title=?, content=?, updated_at=?, metadata=?, version=? WHERE id=?`,
      [row.title, row.content, now, row.metadata, row.version, req.params.id],
      function (err2) {
        if (err2) return res.status(500).json({ error: String(err2) });
        res.json({ status: 'restored', version: row.version });
      }
    );
  });
});

//////////////////////////////////////////
// Folders

// PUBLIC_INTERFACE
// Get all folders
app.get('/api/folders', (req, res) => {
  db.all(`SELECT * FROM folders ORDER BY name`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows);
  });
});

// PUBLIC_INTERFACE
// Create folder
app.post('/api/folders', (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)`,
    [id, name, now], function (err) {
      if (err) return res.status(500).json({ error: String(err) });
      res.json({ id });
    });
});

// PUBLIC_INTERFACE
// Delete folder (and move notes in it to 'uncategorized')
app.delete('/api/folders/:id', (req, res) => {
  db.run(`DELETE FROM folders WHERE id=?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: String(err) });
    db.run(`UPDATE notes SET folder_id = null WHERE folder_id = ?`, [req.params.id]);
    res.json({ status: 'deleted' });
  });
});

/////////////////////////////////////////
// Import/Export
//
// Notes exported/imported in JSON format

// PUBLIC_INTERFACE
// Export all notes/folders/settings
app.get('/api/export', (req, res) => {
  db.all('SELECT * FROM notes', [], (err, notes) => {
    if (err) return res.status(500).json({ error: String(err) });
    db.all('SELECT * FROM folders', [], (err2, folders) => {
      if (err2) return res.status(500).json({ error: String(err2) });
      db.all('SELECT * FROM settings', [], (err3, settings) => {
        if (err3) return res.status(500).json({ error: String(err3) });
        res.setHeader('Content-disposition', 'attachment; filename=notebook-export.json');
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify({ notes, folders, settings }, null, 2));
      });
    });
  });
});

// PUBLIC_INTERFACE
// Import notes/folders/settings (overwrites existing, optional append)
app.post('/api/import', upload.single('import_file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const rawPath = req.file.path;
  fs.readFile(rawPath, (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read file' });
    let parsed;
    try {
      parsed = JSON.parse(data.toString());
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON format' });
    }
    const { notes, folders, settings } = parsed;
    // Overwrite imported data
    db.serialize(() => {
      db.run('DELETE FROM notes');
      db.run('DELETE FROM folders');
      db.run('DELETE FROM settings');
      (folders || []).forEach(f => {
        db.run('INSERT INTO folders (id, name, created_at) VALUES (?, ?, ?)', [f.id, f.name, f.created_at]);
      });
      (notes || []).forEach(n => {
        db.run(
          'INSERT INTO notes (id, title, content, created_at, updated_at, folder_id, metadata, is_deleted, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [n.id, n.title, n.content, n.created_at, n.updated_at, n.folder_id, JSON.stringify(n.metadata || {}), n.is_deleted, n.version]);
      });
      (settings || []).forEach(s => {
        db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [s.key, s.value]);
      });
      fs.unlinkSync(rawPath);
      res.json({ status: 'imported' });
    });
  });
});

// PUBLIC_INTERFACE
// Bulk operation -- update many notes'
app.put('/api/notes/bulk', (req, res) => {
  const { ids, field, value } = req.body; // E.g. mark as deleted, move folder, update metadata, etc.
  if (!Array.isArray(ids) || !field) return res.status(400).json({ error: 'Invalid input' });
  let q = `UPDATE notes SET ${field} = ? WHERE id IN (${ids.map(() => '?').join(',')})`;
  db.run(q, [value, ...ids], function (err) {
    if (err) return res.status(500).json({ error: String(err) });
    res.json({ status: 'bulk updated' });
  });
});

//////////////////////////////////////
// Settings (key-value pairs)
app.get('/api/settings', (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: String(err) });
    res.json(rows);
  });
});
app.put('/api/settings', (req, res) => {
  // {key, value}
  const { key, value } = req.body;
  db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], function (err) {
    if (err) return res.status(500).json({ error: String(err) });
    res.json({ status: 'updated' });
  });
});

//////////////////////////////////////
// Simple Notification System (demo in memory)
let notifications = [];
function addNotification(msg, type = 'info') {
  if (notifications.length > 20) notifications.shift();
  notifications.push({ id: uuidv4(), msg, type, ts: Date.now() });
}

app.get('/api/notifications', (_req, res) => {
  res.json(notifications);
});
// Clear notifications
app.delete('/api/notifications', (_req, res) => {
  notifications = [];
  res.json({ status: 'cleared' });
});

//////////////////////////////////////
// Serve frontend app in production
const clientBuildPath = path.resolve(__dirname, 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`NotebookMonolithicContainer API/server running on port ${PORT}`);
});
