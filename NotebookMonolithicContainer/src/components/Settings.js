/*
  PUBLIC_INTERFACE
  SettingsPanel: User settings UI, theme, and useful toggles
*/
import React, { useEffect, useState } from "react";
import { getSettings, updateSetting } from "../api";

export default function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState([]);
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    getSettings().then(rows => {
      setSettings(rows);
      let t = rows.find(s => s.key === "theme");
      if (t) setTheme(t.value);
    });
  }, []);
  const handleTheme = t => {
    updateSetting("theme", t).then(() => {
      setTheme(t);
      document.documentElement.setAttribute("data-theme", t);
    });
  };
  return (
    <aside className="settings-panel" aria-label="Settings">
      <button className="btn btn-small" onClick={onClose}>✖ Close</button>
      <h4>Settings</h4>
      <div>
        <label>
          Theme:
          <select value={theme} onChange={e => handleTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
      {/* Add future settings toggles here */}
      <ul>
        {settings
          .filter(s => s.key !== "theme")
          .map(s => (
            <li key={s.key}>
              {s.key}: <b>{s.value}</b>
            </li>
          ))}
      </ul>
    </aside>
  );
}
