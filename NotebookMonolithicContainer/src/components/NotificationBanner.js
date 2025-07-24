import React from 'react';
import './NotificationBanner.css';

/**
 * PUBLIC_INTERFACE
 * @component NotificationBanner
 * Props:
 *   - notifications: array of {id, msg, type, ts}
 *   - onClear: function
 */
export default function NotificationBanner({ notifications, onClear }) {
  if (!notifications || notifications.length === 0) return null;
  return (
    <div className="notification-banner" role="alert">
      <ul>
        {notifications.map(n => (
          <li key={n.id} className={n.type}>
            {n.msg}
            <span className="notif-time">
              {n.ts ? new Date(n.ts).toLocaleTimeString() : ''}
            </span>
          </li>
        ))}
      </ul>
      <button
        className="clear-notifications-btn"
        onClick={onClear}
        aria-label="Clear notifications"
      >
        ×
      </button>
    </div>
  );
}
