import React from "react";

export default function AlertList({ list }) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {list.length === 0 ? (
        <p className="text-xs text-slate-400">No alerts yet.</p>
      ) : (
        list.map((item) => (
          <div
            key={item.id}
            className="flex justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm"
          >
            <span>{item.text}</span>
            <span className="text-[10px] text-slate-400">
              {item.timeAgo}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

