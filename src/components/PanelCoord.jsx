import React, { useState } from "react";
import Papa from "papaparse";
import { Lock, Upload, Check, List, Building2, BookOpen, Plus, Trash2, LogOut, Home } from "lucide-react";
import { CATEGORIAS, MUNICIPIOS, inputCls, uid } from "../lib/data.js";
import Tablero from "./Tablero.jsx";
import Arriendos from "./Arriendos.jsx";

const PLANTILLA =
  "tipo,nombre,municipio,sector,categorias,descripcion,urgencia,contacto\n" +
  "solicitud,María,Calarcá,Barrio La Esperanza,agua;alimentos,\"Somos 4 personas, necesitamos agua\",alta,3000000000\n" +
  "oferta,Colectivo Sol,Armenia,,transporte;voluntariado,Tenemos camioneta para repartir,,3110000000";

function EditorDirectorio({ puntos, onGuardar, onEliminar }) {
  const vacio = { nombre: "", tipoPunto: "acopio", municipio: "", direccion: "", recibe: "", horario: "", contacto: "", verificado: true };
  const [f, setF] = useState(vacio);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const guardar = async () => {
    if (guardando) return;
    if (!f.nombre.trim() || !f.municipio) return setError("El nombre y el municipio son obligatorios.");
    setError("");
    setGuardando(true);
    try {
      await onGuardar({ ...f, nombre: f.nombre.trim(), id: uid(), creado: Date.now() });
      setF(vacio);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async (p) => {
    setError("");
    try {
      await onEliminar(p);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="mt-5 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Plus size={16} /> Agregar punto o colectivo</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre del punto o colectivo *" className={inputCls} />
          <select value={f.tipoPunto} onChange={(e) => set("tipoPunto", e.target.value)} className={inputCls + " bg-white"}>
            <option value="acopio">Punto de acopio</option>
            <option value="recoge">Está recogiendo</option>
            <option value="albergue">Albergue</option>
          </select>
          <select value={f.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputCls + " bg-white"}>
            <option value="">Municipio *</option>
            {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={f.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Dirección o referencia" className={inputCls} />
          <input value={f.recibe} onChange={(e) => set("recibe", e.target.value)} placeholder="Qué recibe (ej: agua, aseo, ropa)" className={inputCls} />
          <input value={f.horario} onChange={(e) => set("horario", e.target.value)} placeholder="Horario (ej: 8am–5pm)" className={inputCls} />
          <input value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="Contacto" className={inputCls} />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={f.verificado} onChange={(e) => set("verificado", e.target.checked)} /> Marcar como verificado por el equipo
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">{guardando ? "Guardando…" : "Agregar al directorio"}</button>
      </div>
      <div className="space-y-2">
        {puntos.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
            <span><span className="font-medium text-slate-800">{p.nombre}</span> <span className="text-slate-400">· {p.municipio}</span></span>
            <button onClick={() => eliminar(p)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
        ))}
        {puntos.length === 0 && <p className="text-sm text-slate-400">Todavía no has agregado puntos.</p>}
      </div>
    </div>
  );
}

function EditorGuia({ items, onGuardar, onEliminar }) {
  const [f, setF] = useState({ cat: "", titulo: "", cuerpo: "" });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const guardar = async () => {
    if (guardando) return;
    if (!f.titulo.trim() || !f.cuerpo.trim()) return setError("El título y la respuesta son obligatorios.");
    setError("");
    setGuardando(true);
    try {
      await onGuardar({
        cat: f.cat.trim() || "General", titulo: f.titulo.trim(), cuerpo: f.cuerpo.trim(),
        id: uid(), creado: Date.now(),
      });
      setF({ cat: "", titulo: "", cuerpo: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };
  const eliminar = async (g) => {
    setError("");
    try {
      await onEliminar(g);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="mt-5 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Plus size={16} /> Agregar entrada de asesoría</h3>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={f.cat} onChange={(e) => set("cat", e.target.value)} placeholder="Categoría (ej: Líneas oficiales)" className={inputCls} />
            <input value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Título / pregunta *" className={inputCls} />
          </div>
          <textarea value={f.cuerpo} onChange={(e) => set("cuerpo", e.target.value)} rows={3} placeholder="Respuesta *" className={inputCls} />
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button onClick={guardar} disabled={guardando} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60">{guardando ? "Guardando…" : "Agregar"}</button>
      </div>
      <div className="space-y-2">
        {items.map((g) => (
          <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
            <span><span className="font-medium text-slate-800">{g.titulo}</span> <span className="text-slate-400">· {g.cat}</span></span>
            <button onClick={() => eliminar(g)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400">La guía base ya está disponible. Aquí aparecerán las entradas que agregues.</p>}
      </div>
    </div>
  );
}

export default function PanelCoord({
  solicitudes, ofertas, puntos, guiaExtra,
  onImportar, onGuardarPunto, onEliminarPunto, onGuardarGuia, onEliminarGuia,
  onEstado, onEliminarPub, onRefrescar, cargando, sesion, onSalir,
  arriendos, onEstadoArriendo, onEliminarArriendo, onPedirContacto,
}) {
  const [tab, setTab] = useState("data");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [importando, setImportando] = useState(false);

  const parsear = () => {
    setMsg("");
    setError("");
    const res = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true });
    const okKeys = Object.keys(CATEGORIAS);
    const filas = [];
    (res.data || []).forEach((r) => {
      const tipo = (r.tipo || "").trim().toLowerCase();
      const municipio = (r.municipio || "").trim();
      const cats = (r.categorias || "").split(";").map((s) => s.trim()).filter((s) => okKeys.includes(s));
      if (!["solicitud", "oferta"].includes(tipo) || !municipio || cats.length === 0) return;
      filas.push({
        id: uid(), tipo, nombre: (r.nombre || "").trim() || "Anónimo", municipio,
        sector: (r.sector || "").trim(), cats, descripcion: (r.descripcion || "").trim(),
        urgencia: ["alta", "media", "baja"].includes((r.urgencia || "").trim()) ? r.urgencia.trim() : "media",
        contacto: (r.contacto || "").trim(), estado: "abierta", creado: Date.now(), origen: "importado",
      });
    });
    if (filas.length === 0) {
      setError("No se reconoció ninguna fila válida. Revisa el formato.");
      setPreview(null);
      return;
    }
    setPreview(filas);
  };

  const confirmarImport = async () => {
    if (importando) return;
    setMsg("");
    setError("");
    setImportando(true);
    try {
      await onImportar(preview);
      setMsg(`Se importaron ${preview.length} registros.`);
      setPreview(null);
      setCsv("");
    } catch (e) {
      // Nada se dio por guardado: el CSV sigue ahí para reintentar.
      setError(e.message);
    } finally {
      setImportando(false);
    }
  };

  const tabs = [
    ["data", "Datos", List], ["dir", "Directorio", Building2],
    ["guia", "Asesoría", BookOpen], ["arr", "Arriendos", Home],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <Lock size={16} className="text-slate-400" />
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Panel de coordinación</h2>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
          {sesion?.correo && <span className="hidden sm:inline">{sesion.correo}</span>}
          <button onClick={onSalir} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </div>

      <div className="mt-4 inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1">
        {tabs.map(([k, l, Ic]) => (
          <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-slate-800 text-white" : "text-slate-600"}`}>
            <Ic size={14} /> {l}
          </button>
        ))}
      </div>

      {tab === "data" && (
        <div className="mt-5 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Upload size={16} /> Importar solicitudes y ofrecimientos (CSV)</h3>
            <p className="mt-1 text-sm text-slate-500">
              Pega tus filas en formato CSV. Columnas: <code className="rounded bg-slate-100 px-1 text-xs">tipo, nombre, municipio, sector, categorias, descripcion, urgencia, contacto</code>. Las categorías se separan con punto y coma.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => setCsv(PLANTILLA)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Cargar plantilla de ejemplo</button>
              <span className="self-center text-xs text-slate-400">Categorías válidas: {Object.keys(CATEGORIAS).join(", ")}</span>
            </div>
            <textarea value={csv} onChange={(e) => { setCsv(e.target.value); setPreview(null); }} rows={6} placeholder="Pega aquí tu CSV…" className={inputCls + " mt-3 font-mono text-xs"} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={parsear} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">Revisar</button>
              {preview && (
                <button onClick={confirmarImport} disabled={importando} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                  <Check size={15} /> {importando ? "Importando…" : `Importar ${preview.length} registros`}
                </button>
              )}
              {msg && <span className="text-sm text-slate-600">{msg}</span>}
              {error && <span className="text-sm font-medium text-red-600">{error}</span>}
            </div>
            {preview && (
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-200 text-xs">
                <table className="w-full">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr><th className="p-2">Tipo</th><th className="p-2">Municipio</th><th className="p-2">Categorías</th><th className="p-2">Descripción</th></tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 30).map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="p-2">{r.tipo}</td>
                        <td className="p-2">{r.municipio}</td>
                        <td className="p-2">{r.cats.join(", ")}</td>
                        <td className="p-2 text-slate-500">{r.descripcion.slice(0, 40)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-800">Moderar publicaciones</h3>
            <p className="mb-3 text-sm text-slate-500">
              El teléfono de quien ofrece ayuda no es público. Aquí lo consultas con "Ver contacto"
              para hacer el enlace con quien lo necesita.
            </p>
            <Tablero
              solicitudes={solicitudes} ofertas={ofertas} onEstado={onEstado}
              onRefrescar={onRefrescar} cargando={cargando} filtroInicial={null}
              modo="coord" onEliminar={onEliminarPub} onPedirContacto={onPedirContacto}
            />
          </div>
        </div>
      )}

      {tab === "dir" && <EditorDirectorio puntos={puntos} onGuardar={onGuardarPunto} onEliminar={onEliminarPunto} />}
      {tab === "guia" && <EditorGuia items={guiaExtra} onGuardar={onGuardarGuia} onEliminar={onEliminarGuia} />}
      {tab === "arr" && (
        <Arriendos
          arriendos={arriendos} cargando={cargando} onRefrescar={onRefrescar}
          onEstado={onEstadoArriendo} onEliminar={onEliminarArriendo} modo="coord"
        />
      )}
    </div>
  );
}
