import React, { useState } from 'react';
import './SettingsPanel.css';

/**
 * PUBLIC_INTERFACE
 * @component SettingsPanel
 * @description Settings (theme, font, etc.), with save.
 *
 * Props:
 *   - settings: {key: value,...}
 *   - onChange: function(key, value)
 *   - onSave: function(updated)
 */
export default function SettingsPanel({ settings, onChange, onSave }) {
  const [editing, setEditing] = useState({});
  const fields = [
    { key: "theme", label: "Dark mode", input: "toggle" },
    { key: "font", label: "Font Family", input: "text" },
    { key: "spellCheck", label: "Spell Check", input: "toggle" },
  ];

  return (
    <div className="settings-panel">
      <h3>Settings</h3>
      {fields.map(f => (
        <div key={f.key} className="setting-row">
          <label>{f.label}</label>
          {f.input === 'toggle' ? (
            <input
              type="checkbox"
              checked={Boolean(settings[f.key])}
              onChange={e => {
                onChange(f.key, e.target.checked);
                setEditing({ ...editing, [f.key]: e.target.checked });
              }}
              aria-label={f.label}
            />
          ) : (
            <input
              type="text"
              value={settings[f.key] || ''}
              onChange={e => {
                onChange(f.key, e.target.value);
                setEditing({ ...editing, [f.key]: e.target.value });
              }}
              aria-label={f.label}
            />
          )}
        </div>
      ))}
      <button onClick={() => onSave(settings)} className="btn">Save</button>
    </div>
  );
}
