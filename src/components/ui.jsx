import React, { useState, useEffect, useRef, Suspense } from "react";
import { Camera, X, MapPin, LoaderCircle, Check, Map } from "lucide-react";
import { CATEGORIAS } from "../lib/data.js";
import { TIPOS_ACEPTADOS } from "../lib/imagenes.js";

// Arrastra Leaflet consigo, así que solo se descarga si alguien abre el mapa.
const SelectorMapa = React.lazy(() => import("./SelectorMapa.jsx"));

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

// Monta su contenido solo cuando entra (o casi entra) en pantalla. Se usa para
// el mapa del inicio: así quien abre la página y no baja nunca descarga Leaflet.
export function AlAparecer({ alto = 320, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, [visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight: alto }}>
      {visible ? children : null}
    </div>
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

// Selector de foto con vista previa. La compresión ocurre al enviar, no aquí,
// para que elegir la foto sea instantáneo.
export function SelectorImagen({ archivo, onArchivo, disabled }) {
  const [vista, setVista] = useState(null);

  useEffect(() => {
    if (!archivo) {
      setVista(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  if (vista) {
    return (
      <div className="relative inline-block">
        <img src={vista} alt="Vista previa" className="h-32 w-32 rounded-lg border border-slate-200 object-cover" />
        <button
          type="button"
          onClick={() => onArchivo(null)}
          disabled={disabled}
          className="absolute -right-2 -top-2 rounded-full border border-slate-300 bg-white p-1 text-slate-500 shadow-sm hover:text-red-600 disabled:opacity-60"
          aria-label="Quitar la foto"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50">
      <Camera size={16} className="text-slate-400" />
      Agregar una foto
      <input
        type="file"
        accept={TIPOS_ACEPTADOS}
        capture="environment"
        disabled={disabled}
        onChange={(e) => onArchivo(e.target.files?.[0] || null)}
        className="hidden"
      />
    </label>
  );
}

// Dos caminos para lo mismo: el GPS del aparato, o marcar el punto a mano en
// un mapa. El segundo no es un repuesto del primero: mucha gente publica desde
// otro lado, y hay quien registra la solicitud de un vecino.
export function SelectorUbicacion({ coords, onCoords, disabled }) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [abrirMapa, setAbrirMapa] = useState(false);

  const pedir = () => {
    if (!navigator.geolocation) {
      return setError("Este navegador no permite compartir la ubicación. Usa 'Marcar en el mapa'.");
    }
    setError("");
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBuscando(false);
      },
      (err) => {
        setBuscando(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "No diste permiso de ubicación. Puedes marcarla a mano en el mapa."
            : "No se pudo obtener la ubicación. Puedes marcarla a mano en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const mapa = abrirMapa && (
    <Suspense fallback={null}>
      <SelectorMapa
        inicial={coords}
        onConfirmar={(c) => {
          onCoords(c);
          setAbrirMapa(false);
          setError("");
        }}
        onCancelar={() => setAbrirMapa(false)}
      />
    </Suspense>
  );

  if (coords) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700">
          <Check size={12} /> Ubicación agregada
        </Chip>
        <button
          type="button"
          onClick={() => setAbrirMapa(true)}
          disabled={disabled}
          className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:opacity-60"
        >
          Ajustar en el mapa
        </button>
        <button
          type="button"
          onClick={() => onCoords(null)}
          disabled={disabled}
          className="text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-800 disabled:opacity-60"
        >
          Quitar
        </button>
        {mapa}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pedir}
          disabled={disabled || buscando}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {buscando ? <LoaderCircle size={15} className="animate-spin" /> : <MapPin size={15} />}
          {buscando ? "Buscando…" : "Usar mi ubicación actual"}
        </button>
        <button
          type="button"
          onClick={() => setAbrirMapa(true)}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Map size={15} /> Marcar en el mapa
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
      {mapa}
    </div>
  );
}
