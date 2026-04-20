import React from "react";

export default function InputBox({
  value,
  onChange,
  onSubmit,
  placeholder = "Type here...",
}) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        placeholder={placeholder}
      />
      <button
        onClick={onSubmit}
        className="btn-md btn-primary"
      >
        Send
      </button>
    </div>
  );
}
