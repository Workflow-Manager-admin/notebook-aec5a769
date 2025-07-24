/*
  PUBLIC_INTERFACE
  NotificationsPanel: lists unread notifications, allows marking as read
*/
import React, { useEffect, useState } from "react";
import { getNotifications, markNotificationRead } from "../api";

export default function NotificationsPanel({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);
  const handleMarkRead = id => {
    markNotificationRead(id).then(() =>
      setNotifications(notifications =>
        notifications.map(n =>
          n.id === id ? { ...n, read: 1 } : n
        )
      )
    );
  };
  return (
    <aside className="notification-panel" aria-label="Notifications">
      <button className="btn btn-small" onClick={onClose}>✖ Close</button>
      <h4>Notifications</h4>
      <ul>
        {notifications.length === 0 && <li style={{ opacity: 0.66 }}>No notifications</li>}
        {notifications.map(n => (
          <li key={n.id} style={{ fontWeight: n.read ? 400 : 700 }}>
            {n.message}
            <small style={{ marginLeft: 4, color: "#999" }}>({n.type})</small>
            {!n.read && (
              <button
                className="btn btn-small"
                onClick={() => handleMarkRead(n.id)}
                style={{ marginLeft: 4 }}
              >
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
