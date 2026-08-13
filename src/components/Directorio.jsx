import React, { useState } from "react";
import { Filter, RefreshCw, MapPin, Clock, Phone, Building2, ShieldCheck } from "lucide-react";
import { MUNICIPIOS, soloDigitos } from "../lib/data.js";
import { Chip } from "./ui.jsx";

const TIPO = { acopio: "Punto de acopio", recoge: "Está recogiendo", albergue: "Albergue" };

export default function Directorio({ puntos, cargando, onRefrescar }) {
  const [fMun, setFMun] = useState("");
  const lista = puntos.filter((p) => !fMun || p.municipio === fMun);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dónde llevar y quién está recogiendo</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Información recopilada por el equipo sobre puntos de acopio, albergues y colectivos que están recibiendo donaciones. No administramos estos lugares; compartimos su información.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select value={fMun} onChange={(e) => setFMun(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none">
          <option value="">Todos los municipios</option>
          {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={onRefrescar} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lista.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
              {p.verificado && <Chip className="bg-emerald-50 text-emerald-700 border-emerald-200"><ShieldCheck size={12} /> Verificado</Chip>}
            </div>
            <Chip className="mt-2 bg-slate-100 text-slate-600 border-slate-200">{TIPO[p.tipoPunto] || "Punto"}</Chip>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin size={13} className="text-slate-400" /> {p.municipio}{p.direccion ? ` · ${p.direccion}` : ""}</p>
            {p.recibe && <p className="mt-2 text-sm text-slate-700"><span className="font-medium text-slate-800">Recibe:</span> {p.recibe}</p>}
            {p.horario && <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Clock size={13} className="text-slate-400" /> {p.horario}</p>}
            {p.contacto && (
              <a href={"https://wa.me/57" + soloDigitos(p.contacto)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Phone size={14} /> {p.contacto}
              </a>
            )}
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Building2 className="mx-auto text-slate-300" size={28} />
          <p className="mt-2 text-sm text-slate-500">Aún no hay puntos cargados. El equipo de coordinación los irá agregando desde el panel.</p>
        </div>
      )}
    </div>
  );
}
