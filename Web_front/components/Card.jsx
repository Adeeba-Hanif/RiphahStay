import React from "react";

/**
 * Card variants:
 *  - default  : white, subtle border + shadow
 *  - stat      : stat card with colored icon block
 *  - accent    : colored left border
 */

export default function Card({ title, children, className = "", action }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-0 mb-4">
          {title && <h3 className="text-sm font-semibold text-slate-700">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

/** Stat card with icon, value, label, optional trend */
export function StatCard({ label, value, icon, color = "indigo", sub, loading }) {
  const palettes = {
    indigo:  { bg: "bg-indigo-100",  text: "text-indigo-600",  val: "text-indigo-700"  },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", val: "text-emerald-700" },
    rose:    { bg: "bg-rose-100",    text: "text-rose-600",    val: "text-rose-700"    },
    amber:   { bg: "bg-amber-100",   text: "text-amber-600",   val: "text-amber-700"   },
    violet:  { bg: "bg-violet-100",  text: "text-violet-600",  val: "text-violet-700"  },
    slate:   { bg: "bg-slate-100",   text: "text-slate-500",   val: "text-slate-700"   },
  };
  const p = palettes[color] || palettes.indigo;

  return (
    <div className="card p-5 flex items-start gap-4">
      {icon && (
        <div className={`${p.bg} ${p.text} p-3 rounded-xl shrink-0 text-lg`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${loading ? "text-slate-200 animate-pulse" : p.val}`}>
          {loading ? "" : value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
