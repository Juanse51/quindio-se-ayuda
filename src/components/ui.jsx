import React from "react";
import { ShieldAlert } from "lucide-react";
import { CATEGORIAS } from "../lib/data.js";

export function Chip({ className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function CatChip({ cat }) {
  const c = CATEGORIAS[cat];
  if (!c) return null;
  const { Icon } = c;
  return (
    <Chip className="bg-slate-50 text-slate-700 border-slate-200">
      <Icon size={12} /> {c.label}
    </Chip>
  );
}

export function Campo({ label, children, hint, req }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {req && " *"}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function BannerEmergencia() {
  return (
    <div className="bg-red-600 text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 text-sm">
        <ShieldAlert size={18} className="shrink-0" />
        <p className="leading-snug">
          <span className="font-semibold">¿Alguien en peligro de muerte?</span>{" "}
          Llama de inmediato al{" "}
          <a href="tel:123" className="font-bold underline underline-offset-2">123</a>. Esta plataforma no coordina rescates.
        </p>
      </div>
    </div>
  );
}
