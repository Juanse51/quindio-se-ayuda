import React, { useState, useMemo } from "react";
import {
  Filter, RefreshCw, MapPin, BedDouble, Bath, Home, Plus, Search, MessageCircle, Check, Trash2, Sofa,
} from "lucide-react";
import {
  ARRIENDO_TIPOS, ESTADOS_ARRIENDO, MUNICIPIOS, precioCOP, soloDigitos, hace,
} from "../lib/data.js";
import { Chip, Galeria } from "./ui.jsx";

function TarjetaArriendo({ item, onEstado, onEliminar }) {
  const [verContacto, setVerContacto] = useState(false);
  const tipo = ARRIENDO_TIPOS[item.tipo]?.label || "Vivienda";
  const arrendado = item.estado === "arrendado";

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${arrendado ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
      <Galeria
        imagenes={item.imagenes}
        alt={`Foto de ${tipo.toLowerCase()} en ${item.municipio}`}
        className={item.imagenes?.length > 1 ? "p-1.5 pb-0" : ""}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-slate-900">{precioCOP(item.precio)}</p>
            <p className="flex items-center gap-1 text-sm text-slate-600">
              <MapPin size={13} className="text-slate-400" />
              {item.municipio}{item.sector ? ` · ${item.sector}` : ""}
            </p>
          </div>
          <span className="whitespace-nowrap text-xs text-slate-400">{hace(item.creado)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip className="border-violet-200 bg-violet-50 text-violet-700"><Home size={12} /> {tipo}</Chip>
          <Chip className="border-slate-200 bg-slate-50 text-slate-700"><BedDouble size={12} /> {item.habitaciones} hab.</Chip>
          <Chip className="border-slate-200 bg-slate-50 text-slate-700"><Bath size={12} /> {item.banos} baño{item.banos === 1 ? "" : "s"}</Chip>
          {item.amoblado && <Chip className="border-amber-200 bg-amber-50 text-amber-700"><Sofa size={12} /> Amoblado</Chip>}
          <Chip className={ESTADOS_ARRIENDO[item.estado]?.chip || ""}>{ESTADOS_ARRIENDO[item.estado]?.label}</Chip>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.descripcion}</p>
        <p className="mt-2 text-sm text-slate-500">{item.nombre}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {!verContacto ? (
            <button
              onClick={() => setVerContacto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ver contacto
            </button>
          ) : (
            <a
              href={"https://wa.me/57" + soloDigitos(item.contacto)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle size={14} /> {item.contacto}
            </a>
          )}
          <div className="ml-auto flex gap-1">
            {!arrendado && (
              <button
                onClick={() => onEstado(item, "arrendado")}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Check size={13} /> Ya se arrendó
              </button>
            )}
            {onEliminar && (
              <button onClick={() => onEliminar(item)} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Arriendos({ arriendos, cargando, onRefrescar, onPublicar, onEstado, onEliminar, modo }) {
  const [fMun, setFMun] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [fMax, setFMax] = useState("");
  const [ocultarArrendados, setOcultarArrendados] = useState(true);

  const lista = useMemo(() => {
    const tope = parseInt(fMax.replace(/\D/g, ""), 10);
    return arriendos.filter(
      (a) =>
        (!fMun || a.municipio === fMun) &&
        (!fTipo || a.tipo === fTipo) &&
        (!Number.isFinite(tope) || (typeof a.precio === "number" && a.precio <= tope)) &&
        (!ocultarArrendados || a.estado !== "arrendado")
    );
  }, [arriendos, fMun, fTipo, fMax, ocultarArrendados]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Casas y apartamentos en arriendo</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Viviendas disponibles en todo el Quindío, publicadas por sus propios dueños. La plataforma
            no intermedia ni cobra nada: contacta directamente a quien publica.
          </p>
        </div>
        {modo !== "coord" && (
          <button
            onClick={onPublicar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={16} /> Publicar vivienda
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select value={fMun} onChange={(e) => setFMun(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none">
          <option value="">Todos los municipios</option>
          {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none">
          <option value="">Cualquier tipo</option>
          {Object.entries(ARRIENDO_TIPOS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
        </select>
        <input
          inputMode="numeric"
          value={fMax}
          onChange={(e) => setFMax(e.target.value)}
          placeholder="Precio máximo"
          className="w-36 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
        />
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={ocultarArrendados} onChange={(e) => setOcultarArrendados(e.target.checked)} />
          Ocultar arrendados
        </label>
        <button
          onClick={onRefrescar}
          disabled={cargando}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lista.map((a) => (
          <TarjetaArriendo key={a.id} item={a} onEstado={onEstado} onEliminar={modo === "coord" ? onEliminar : null} />
        ))}
      </div>

      {lista.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Search className="mx-auto text-slate-300" size={28} />
          <p className="mt-2 text-sm text-slate-500">
            No hay viviendas publicadas con estos filtros todavía.
          </p>
        </div>
      )}
    </div>
  );
}
