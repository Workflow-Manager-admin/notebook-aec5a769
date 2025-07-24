import React, { useState } from 'react';
import './SearchBar.css';

/**
 * PUBLIC_INTERFACE
 * @component SearchBar
 *
 * Props:
 *   - onSearch: function(query)
 *   - value: string
 *   - onValueChange: function(query)
 */
export default function SearchBar({ onSearch, value, onValueChange }) {
  const [input, setInput] = useState(value || '');

  // Called on enter key (search)
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch(input);
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        value={input}
        placeholder="Search notes..."
        aria-label="Search notes"
        onChange={e => {
          setInput(e.target.value);
          onValueChange && onValueChange(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      <button aria-label="Submit search" onClick={() => onSearch(input)}>🔍</button>
    </div>
  );
}
