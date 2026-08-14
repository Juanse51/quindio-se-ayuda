import React, { useState, useEffect, useRef, Suspense } from "react";
import { Camera, X, MapPin, LoaderCircle, Check, Map } from "lucide-react";
import { CATEGORIAS } from "../lib/data.js";
import { TIPOS_ACEPTADOS, MAX_FOTOS, urlImagen } from "../lib/imagenes.js";

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

// Las fotos de una publicación. Abrir en pestaña nueva hace las veces de
// "ver en grande" sin cargar un visor completo.
export function Galeria({ imagenes, alt = "Foto de la publicación", className = "" }) {
  const urls = (imagenes || []).map(urlImagen).filter(Boolean);
  if (urls.length === 0) return null;

  if (urls.length === 1) {
    return (
      <a href={urls[0]} target="_blank" rel="noreferrer" className={`block ${className}`}>
        <img src={urls[0]} alt={alt} loading="lazy" className="max-h-56 w-full rounded-lg border border-slate-200 object-cover" />
      </a>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {urls.map((u, i) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt={`${alt} ${i + 1}`} loading="lazy" className="h-28 w-full rounded-lg border border-slate-200 object-cover" />
        </a>
      ))}
    </div>
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

// Varias fotos con vista previa. La compresión ocurre al enviar, no aquí, para
// que elegirlas sea instantáneo aunque sean pesadas.
export function SelectorImagenes({ archivos, onArchivos, disabled }) {
  const [vistas, setVistas] = useState([]);

  useEffect(() => {
    const urls = archivos.map((a) => URL.createObjectURL(a));
    setVistas(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [archivos]);

  const agregar = (lista) => {
    const nuevas = Array.from(lista || []).filter((f) => f.type?.startsWith("image/"));
    onArchivos([...archivos, ...nuevas].slice(0, MAX_FOTOS));
  };

  const quitar = (i) => onArchivos(archivos.filter((_, j) => j !== i));
  const lleno = archivos.length >= MAX_FOTOS;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {vistas.map((url, i) => (
          <div key={url} className="relative">
            <img src={url} alt={`Foto ${i + 1}`} className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
            <button
              type="button"
              onClick={() => quitar(i)}
              disabled={disabled}
              className="absolute -right-2 -top-2 rounded-full border border-slate-300 bg-white p-1 text-slate-500 shadow-sm hover:text-red-600 disabled:opacity-60"
              aria-label={`Quitar la foto ${i + 1}`}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {!lleno && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 hover:border-slate-400 hover:bg-slate-50">
            <Camera size={18} className="text-slate-400" />
            {archivos.length === 0 ? "Agregar foto" : "Otra más"}
            <input
              type="file"
              accept={TIPOS_ACEPTADOS}
              multiple
              disabled={disabled}
              onChange={(e) => {
                agregar(e.target.files);
                e.target.value = ""; // permite volver a elegir el mismo archivo
              }}
              className="hidden"
            />
          </label>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-400">
        {lleno ? `Máximo ${MAX_FOTOS} fotos.` : `Puedes agregar hasta ${MAX_FOTOS}.`}
      </p>
    </div>
  );
}

// Dos caminos para lo mismo: el GPS del aparato, o marcar el punto a mano en
// un mapa. El segundo no es un repuesto del primero: mucha gente publica desde
// otro lado, y hay quien registra la solicitud de un vecino.
export function SelectorUbicacion({ coords, onCoords, disabled, municipio }) {
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
        municipio={municipio}
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
