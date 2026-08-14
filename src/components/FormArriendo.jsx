import React, { useState } from "react";
import { X } from "lucide-react";
import { ARRIENDO_TIPOS, MUNICIPIOS, inputCls, uid } from "../lib/data.js";
import { subirImagen } from "../lib/imagenes.js";
import { Campo, SelectorImagen } from "./ui.jsx";

const VACIO = {
  tipo: "apartamento", nombre: "", municipio: "", sector: "",
  habitaciones: "1", banos: "1", precio: "", amoblado: false,
  descripcion: "", contacto: "",
};

export default function FormArriendo({ onEnviar, onCancelar }) {
  const [f, setF] = useState(VACIO);
  const [foto, setFoto] = useState(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const enviar = async () => {
    if (enviando) return;
    if (!f.municipio) return setError("Selecciona el municipio.");
    if (!f.descripcion.trim()) return setError("Describe brevemente la vivienda.");
    if (!f.contacto.trim()) return setError("Deja un contacto para que puedan escribirte.");
    setError("");
    setEnviando(true);
    try {
      const imagen = await subirImagen(foto);
      // El precio se escribe con puntos y comas; a la base va solo el número.
      const precio = parseInt(f.precio.replace(/\D/g, ""), 10);
      await onEnviar({
        id: uid(), tipo: f.tipo, nombre: f.nombre.trim() || "Anónimo",
        municipio: f.municipio, sector: f.sector.trim(),
        habitaciones: parseInt(f.habitaciones, 10) || 0,
        banos: parseInt(f.banos, 10) || 0,
        precio: Number.isFinite(precio) ? precio : null,
        amoblado: f.amoblado, descripcion: f.descripcion.trim(),
        contacto: f.contacto.trim(), imagen,
        estado: "disponible", creado: Date.now(), origen: "web",
      });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={onCancelar} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <X size={16} /> Volver
      </button>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Publicar una vivienda en arriendo</h2>
      <p className="mt-1 text-sm text-slate-500">
        Para quienes quedaron sin dónde vivir tras el sismo. Publica solo inmuebles que estén realmente disponibles.
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Tipo de vivienda" req>
            <select value={f.tipo} onChange={(e) => set("tipo", e.target.value)} className={inputCls + " bg-white"}>
              {Object.entries(ARRIENDO_TIPOS).map(([k, t]) => (
                <option key={k} value={k}>{t.label}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Municipio" req>
            <select value={f.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputCls + " bg-white"}>
              <option value="">Selecciona…</option>
              {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
        </div>

        <Campo label="Barrio o sector (opcional)">
          <input value={f.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Ej: barrio Las Colinas" className={inputCls} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Habitaciones">
            <input type="number" min="0" max="20" value={f.habitaciones} onChange={(e) => set("habitaciones", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Baños">
            <input type="number" min="0" max="20" value={f.banos} onChange={(e) => set("banos", e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Canon mensual" hint="Déjalo vacío si es a convenir.">
            <input inputMode="numeric" value={f.precio} onChange={(e) => set("precio", e.target.value)} placeholder="800000" className={inputCls} />
          </Campo>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.amoblado} onChange={(e) => set("amoblado", e.target.checked)} /> Está amoblado
        </label>

        <Campo label="Descripción" req>
          <textarea
            value={f.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            rows={3}
            placeholder="Ej: apartamento en segundo piso, con cocina integral, servicios incluidos. Disponible desde ya."
            className={inputCls}
          />
        </Campo>

        <Campo label="Foto (opcional)" hint="Una foto de la vivienda ayuda muchísimo a que la contacten.">
          <SelectorImagen archivo={foto} onArchivo={setFoto} disabled={enviando} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Tu nombre (opcional)">
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Como quieres que te llamen" className={inputCls} />
          </Campo>
          <Campo label="Contacto (WhatsApp o teléfono)" req>
            <input value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="Ej: 300 000 0000" className={inputCls} />
          </Campo>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {enviando ? (foto ? "Subiendo la foto…" : "Publicando…") : "Publicar vivienda"}
        </button>
      </div>
    </div>
  );
}
