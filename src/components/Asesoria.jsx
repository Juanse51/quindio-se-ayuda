import React, { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { GUIA_BASE } from "../lib/data.js";

export default function Asesoria({ extra }) {
  const todas = [...GUIA_BASE, ...extra];
  const cats = ["Todas", ...Array.from(new Set(todas.map((g) => g.cat)))];
  const [fCat, setFCat] = useState("Todas");
  const [abierta, setAbierta] = useState(null);
  const lista = todas.filter((g) => fCat === "Todas" || g.cat === fCat);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Asesoría e información</h2>
      <p className="mt-1 text-sm text-slate-500">Guía práctica revisada por el equipo. Para emergencias que ponen en riesgo la vida, siempre el 123.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setFCat(c)} className={`rounded-full border px-3 py-1.5 text-sm ${fCat === c ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {lista.map((g) => {
          const open = abierta === g.id;
          return (
            <div key={g.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button onClick={() => setAbierta(open ? null : g.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="flex items-center gap-2 font-medium text-slate-800"><BookOpen size={16} className="text-slate-400" /> {g.titulo}</span>
                <ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {open && <p className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600">{g.cuerpo}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
