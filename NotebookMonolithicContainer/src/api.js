// PUBLIC_INTERFACE
// Central API client for NotebookMonolithicContainer frontend
// All frontend code uses these functions for backend communication
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4001';

// Helper for fetch requests
async function apiFetch(path, opts = {}) {
  let res = await fetch(API_URL + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json())?.error || res.statusText);
  return res.json();
}

// --- Notes API ---
// PUBLIC_INTERFACE
export async function getNotes({folderId, q, trash} = {}) {
  let params = [];
  if (folderId) params.push(`folderId=${folderId}`);
  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (trash !== undefined) params.push(`trash=${trash ? 1 : 0}`);
  let query = params.length ? ('?' + params.join('&')) : '';
  return apiFetch('/api/notes' + query);
}

// PUBLIC_INTERFACE
export async function getNote(id) {
  return apiFetch(`/api/notes/${id}`);
}

// PUBLIC_INTERFACE
export async function createNote(note) {
  return apiFetch('/api/notes', {method: 'POST', body: note});
}

// PUBLIC_INTERFACE
export async function updateNote(id, data) {
  return apiFetch(`/api/notes/${id}`, {method: 'PUT', body: data});
}

// PUBLIC_INTERFACE
export async function deleteNote(id, permanent = false) {
  return apiFetch(`/api/notes/${id}${permanent ? '/permanent' : ''}`, {method: 'DELETE'});
}

// PUBLIC_INTERFACE
export async function restoreNote(id) {
  return apiFetch(`/api/notes/${id}/restore`, {method: 'POST'});
}

// PUBLIC_INTERFACE
export async function bulkNoteAction(noteIds, action) {
  return apiFetch('/api/notes/bulk', {method: 'POST', body: {noteIds, action}});
}

// PUBLIC_INTERFACE
export async function getNoteVersions(id) {
  return apiFetch(`/api/notes/${id}/versions`);
}

// PUBLIC_INTERFACE
export async function restoreNoteVersion(id, version_id) {
  return apiFetch(`/api/notes/${id}/restore-version`, {method: 'POST', body: {version_id}});
}

// --- Folders API ---
// PUBLIC_INTERFACE
export async function getFolders() {
  return apiFetch('/api/folders');
}

// PUBLIC_INTERFACE
export async function createFolder(name) {
  return apiFetch('/api/folders', {method: 'POST', body: {name}});
}

// PUBLIC_INTERFACE
export async function deleteFolder(id) {
  return apiFetch(`/api/folders/${id}`, {method: 'DELETE'});
}

// --- Export/Import ---
// PUBLIC_INTERFACE
export async function exportData() {
  return apiFetch('/api/export');
}

// PUBLIC_INTERFACE
export async function importData(payload) {
  return apiFetch('/api/import', {method: 'POST', body: payload});
}

// --- Settings ---
// PUBLIC_INTERFACE
export async function getSettings() {
  return apiFetch('/api/settings');
}

// PUBLIC_INTERFACE
export async function updateSetting(key, value) {
  return apiFetch('/api/settings', {method: 'POST', body: {key, value}});
}

// --- Notifications ---
// PUBLIC_INTERFACE
export async function getNotifications() {
  return apiFetch('/api/notifications');
}

// PUBLIC_INTERFACE
export async function addNotification(message, type = 'info') {
  return apiFetch('/api/notifications', {method: 'POST', body: {message, type}});
}

// PUBLIC_INTERFACE
export async function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read`, {method: 'POST'});
}
