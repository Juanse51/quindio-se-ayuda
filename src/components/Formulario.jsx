import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { CATEGORIAS, URGENCIAS, MUNICIPIOS, ACENTO, inputCls, uid } from "../lib/data.js";
import { subirImagen } from "../lib/imagenes.js";
import { Campo, SelectorImagen, SelectorUbicacion } from "./ui.jsx";

export default function Formulario({ tipo, onEnviar, onCancelar }) {
  const esPedir = tipo === "solicitud";
  const a = ACENTO[tipo];
  const [f, setF] = useState({ nombre: "", municipio: "", sector: "", descripcion: "", urgencia: "media", contacto: "" });
  const [cats, setCats] = useState([]);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [foto, setFoto] = useState(null);
  const [coords, setCoords] = useState(null);
  const [autoriza, setAutoriza] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleCat = (k) => setCats((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const enviar = async () => {
    if (enviando) return; // evita publicar dos veces si la red va lenta
    if (!f.municipio) return setError("Selecciona el municipio.");
    if (cats.length === 0) return setError("Elige al menos una categoría.");
    if (!f.descripcion.trim()) return setError("Describe brevemente la situación.");
    if (!f.contacto.trim()) return setError("Deja un contacto para que puedan ubicarte.");
    if (!autoriza) return setError("Falta autorizar el uso de los datos para poder publicar.");
    setError("");
    setEnviando(true);
    try {
      // La foto se sube primero: si falla, no queremos una publicación a medias.
      const imagen = await subirImagen(foto);
      await onEnviar({
        id: uid(), tipo, nombre: f.nombre.trim() || "Anónimo", municipio: f.municipio,
        sector: f.sector.trim(), cats, descripcion: f.descripcion.trim(),
        urgencia: esPedir ? f.urgencia : "media", contacto: f.contacto.trim(),
        imagen, lat: coords?.lat ?? null, lng: coords?.lng ?? null,
        consentimiento: true,
        estado: "abierta", creado: Date.now(), origen: "web",
      });
    } catch (e) {
      // No se guardó: se conserva lo escrito para poder reintentar.
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button onClick={onCancelar} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <X size={16} /> Volver
      </button>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">{esPedir ? "Pedir ayuda" : "Ofrecer ayuda"}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {esPedir
          ? "Cuéntanos qué necesitas. Solo se muestra lo indispensable para que te ubiquen."
          : "Cuéntanos con qué puedes ayudar y en qué zona."}
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre (opcional)">
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Como quieres que te llamen" className={inputCls} />
          </Campo>
          <Campo label="Municipio" req>
            <select value={f.municipio} onChange={(e) => set("municipio", e.target.value)} className={inputCls + " bg-white"}>
              <option value="">Selecciona…</option>
              {MUNICIPIOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Campo>
        </div>

        <Campo label="Barrio, sector o dirección (opcional)">
          <input value={f.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Ej: barrio Las Colinas, calle 20 #14-30, vereda…" className={inputCls} />
        </Campo>

        <Campo
          label="Ubicación en el mapa (opcional)"
          hint="Aparecerá como un punto en el mapa público. Puedes usar tu ubicación actual, o marcarla a mano si estás publicando desde otro lado o registrando el caso de otra persona."
        >
          <SelectorUbicacion coords={coords} onCoords={setCoords} disabled={enviando} />
        </Campo>

        <Campo label={esPedir ? "¿Qué necesitas?" : "¿Con qué puedes ayudar?"} req>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORIAS).map(([k, c]) => {
              const on = cats.includes(k);
              const { Icon } = c;
              return (
                <button key={k} type="button" onClick={() => toggleCat(k)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? a.chipOn : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                  <Icon size={14} /> {c.label}
                </button>
              );
            })}
          </div>
        </Campo>

        <Campo label="Descripción" req>
          <textarea value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} rows={3}
            placeholder={esPedir ? "Ej: somos 4 personas, necesitamos agua y algo para dormir esta noche." : "Ej: tengo camioneta y puedo transportar mercados dentro de Armenia."}
            className={inputCls} />
        </Campo>

        <Campo
          label="Foto (opcional)"
          hint={esPedir ? "Una foto ayuda a entender la situación. No subas fotos de personas sin su permiso." : "Por ejemplo, lo que tienes disponible para entregar."}
        >
          <SelectorImagen archivo={foto} onArchivo={setFoto} disabled={enviando} />
        </Campo>

        {esPedir && (
          <Campo label="Nivel de urgencia">
            <div className="flex gap-2">
              {Object.entries(URGENCIAS).map(([k, u]) => (
                <button key={k} type="button" onClick={() => set("urgencia", k)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${f.urgencia === k ? u.chip : "border-slate-300 text-slate-500 hover:border-slate-400"}`}>
                  {u.label}
                </button>
              ))}
            </div>
            {f.urgencia === "alta" && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> Si hay vidas en riesgo inmediato, llama al 123 antes de publicar aquí.
              </p>
            )}
          </Campo>
        )}

        <Campo
          label="Contacto (WhatsApp o teléfono)"
          req
          hint={esPedir
            ? "Se mostrará a quien quiera ayudarte. No pongas datos que no quieras hacer públicos."
            : "Tu teléfono NO se publica. Solo lo ve el equipo de coordinación, que te escribe cuando haya alguien a quien puedas ayudar."}
        >
          <input value={f.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="Ej: 300 000 0000" className={inputCls} />
        </Campo>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={autoriza}
            onChange={(e) => setAutoriza(e.target.checked)}
            className="mt-0.5 shrink-0"
          />
          <span>
            {esPedir ? (
              <>
                Autorizo el uso de estos datos para gestionar esta ayuda y que la publicación sea
                visible en la plataforma. Si estoy publicando por otra persona, confirmo que ella lo
                autorizó.
              </>
            ) : (
              <>
                Autorizo el uso de estos datos para gestionar esta ayuda. Entiendo que mi teléfono no
                será público y que el equipo de coordinación lo usará para contactarme.
              </>
            )}
          </span>
        </label>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button onClick={enviar} disabled={enviando} className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${a.solid}`}>
          {enviando ? (foto ? "Subiendo la foto…" : "Publicando…") : esPedir ? "Publicar solicitud" : "Publicar ofrecimiento"}
        </button>
      </div>
    </div>
  );
}
