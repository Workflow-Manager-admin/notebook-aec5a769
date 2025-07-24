/*
  PUBLIC_INTERFACE
  RichTextEditor: A simple, accessible rich text editing component for the notebook app
*/

import React, { useRef } from "react";
import "./RichTextEditor.css";

const toolbarButtons = [
  { cmd: "bold", icon: "𝐁", label: "Bold" },
  { cmd: "italic", icon: "𝘐", label: "Italic" },
  { cmd: "underline", icon: "U̲", label: "Underline" },
  { cmd: "insertUnorderedList", icon: "• List", label: "Bullet List" },
  { cmd: "insertOrderedList", icon: "1. List", label: "Numbered List" },
  { cmd: "formatBlock", arg: "h1", icon: "H1", label: "Heading 1" },
  { cmd: "formatBlock", arg: "h2", icon: "H2", label: "Heading 2" },
  { cmd: "removeFormat", icon: "🚫", label: "Clear formatting" }
];

// PUBLIC_INTERFACE
export default function RichTextEditor({
  value,
  onChange,
  ariaLabel = "Note editor"
}) {
  const ref = useRef();
  const handleInput = () => {
    if (onChange) onChange(ref.current.innerHTML);
  };
  const handleButton = (cmd, arg) => {
    document.execCommand(cmd, false, arg);
    handleInput();
    ref.current.focus();
  };
  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar">
        {toolbarButtons.map((btn, i) => (
          <button
            type="button"
            key={btn.label}
            title={btn.label}
            aria-label={btn.label}
            tabIndex={0}
            className="rte-btn"
            onClick={() => handleButton(btn.cmd, btn.arg)}
          >
            {btn.icon}
          </button>
        ))}
      </div>
      <div
        className="rte-content"
        contentEditable
        aria-label={ariaLabel}
        spellCheck={true}
        tabIndex={0}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: value || "" }}
        style={{ minHeight: "140px", outline: "none", background: "var(--bg-secondary)", padding: "8px", borderRadius: 6 }}
      />
    </div>
  );
}
