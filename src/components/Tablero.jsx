import React, { useState, useEffect, useMemo } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import { CATEGORIAS, MUNICIPIOS } from "../lib/data.js";
import Tarjeta from "./Tarjeta.jsx";

export default function Tablero({ solicitudes, ofertas, onEstado, onRefrescar, cargando, filtroInicial, modo, onEliminar }) {
  const [pestana, setPestana] = useState(filtroInicial?.pestana || "solicitud");
  const [fMun, setFMun] = useState(filtroInicial?.municipio || "");
  const [fCat, setFCat] = useState("");
  const [ocultarResueltas, setOcultarResueltas] = useState(true);

  useEffect(() => {
    if (filtroInicial) {
      setPestana(filtroInicial.pestana || "solicitud");
      setFMun(filtroInicial.municipio || "");
      setFCat("");
    }
  }, [filtroInicial]);

  const base = pestana === "solicitud" ? solicitudes : ofertas;
  const lista = useMemo(
    () => base.filter((it) =>
      (!fMun || it.municipio === fMun) &&
      (!fCat || it.cats.includes(fCat)) &&
      (!ocultarResueltas || it.estado !== "resuelta")
    ),
    [base, fMun, fCat, ocultarResueltas]
  );

  const compatiblesDe = (sol) =>
    ofertas.filter((o) => o.estado === "abierta" && o.municipio === sol.municipio && o.cats.some((c) => sol.cats.includes(c))).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button onClick={() => setPestana("solicitud")} className={`rounded-md px-4 py-1.5 text-sm font-medium ${pestana === "solicitud" ? "bg-blue-600 text-white" : "text-slate-600"}`}>
            Solicitudes ({solicitudes.filter((s) => s.estado !== "resuelta").length})
          </button>
          <button onClick={() => setPestana("oferta")} className={`rounded-md px-4 py-1.5 text-sm font-medium ${pestana === "oferta" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
            Ofrecimientos ({ofertas.filter((o) => o.estado !== "resuelta").length})
          </button>
        </div>
        <button onClick={onRefrescar} disabled={cargando} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select value={fMun} onChange={(e) => setFMun(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none">
          <option value="">Todos los municipios</option>
          {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={ocultarResueltas} onChange={(e) => setOcultarResueltas(e.target.checked)} /> Ocultar resueltas
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lista.map((it) => (
          <Tarjeta key={it.id} item={it}
            compatibles={it.tipo === "solicitud" ? compatiblesDe(it) : 0}
            onEstado={onEstado}
            onEliminar={modo === "coord" ? onEliminar : null}
            onVerCompatibles={() => { setPestana("oferta"); setFMun(it.municipio); setFCat(""); }} />
        ))}
      </div>

      {lista.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Search className="mx-auto text-slate-300" size={28} />
          <p className="mt-2 text-sm text-slate-500">No hay {pestana === "solicitud" ? "solicitudes" : "ofrecimientos"} con estos filtros todavía.</p>
        </div>
      )}
    </div>
  );
}
