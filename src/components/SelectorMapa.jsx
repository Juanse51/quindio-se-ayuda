import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, X, Check, LoaderCircle, Crosshair } from "lucide-react";
import { MAPA, inputCls } from "../lib/data.js";

const ICONO = L.divIcon({
  className: "",
  html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#dc2626;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Rectángulo que envuelve al Quindío. Se le pasa a Nominatim para que no
// devuelva calles con el mismo nombre en Bogotá o Medellín.
const CAJA_QUINDIO = "-75.95,4.80,-75.35,4.10";

function ClicEnMapa({ onPos }) {
  useMapEvents({
    click: (e) => onPos([e.latlng.lat, e.latlng.lng]),
  });
  return null;
}

function IrA({ pos, zoom }) {
  const mapa = useMap();
  const anterior = useRef(null);
  useEffect(() => {
    const clave = `${pos[0]},${pos[1]},${zoom}`;
    if (anterior.current === clave) return;
    anterior.current = clave;
    mapa.setView(pos, zoom);
  }, [mapa, pos, zoom]);
  return null;
}

export default function SelectorMapa({ inicial, onConfirmar, onCancelar }) {
  const [pos, setPos] = useState(inicial ? [inicial.lat, inicial.lng] : MAPA.centro);
  const [zoom, setZoom] = useState(inicial ? 16 : MAPA.zoom);
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [aviso, setAviso] = useState("");

  const buscar = async () => {
    const q = texto.trim();
    if (!q || buscando) return;
    setBuscando(true);
    setAviso("");
    setResultados([]);
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=co" +
        `&viewbox=${CAJA_QUINDIO}&bounded=1&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { "Accept-Language": "es" } });
      if (!r.ok) throw new Error();
      const datos = await r.json();
      if (datos.length === 0) {
        setAviso("No se encontró esa dirección. Prueba con el barrio, o marca el punto tocando el mapa.");
      }
      setResultados(datos);
    } catch {
      setAviso("No se pudo buscar la dirección. Marca el punto tocando el mapa.");
    } finally {
      setBuscando(false);
    }
  };

  const elegir = (r) => {
    setPos([parseFloat(r.lat), parseFloat(r.lon)]);
    setZoom(17);
    setResultados([]);
    setTexto(r.display_name.split(",").slice(0, 2).join(", "));
  };

  const miUbicacion = () => {
    if (!navigator.geolocation) return;
    setAviso("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        setZoom(17);
      },
      () => setAviso("No se pudo obtener tu ubicación. Marca el punto tocando el mapa."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Marca el punto en el mapa</h3>
        <button onClick={onCancelar} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder="Escribe una dirección o barrio…"
            className={inputCls}
          />
          <button
            onClick={buscar}
            disabled={buscando}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          >
            {buscando ? <LoaderCircle size={15} className="animate-spin" /> : <Search size={15} />}
            Buscar
          </button>
          <button
            onClick={miUbicacion}
            title="Usar mi ubicación actual"
            className="inline-flex shrink-0 items-center rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50"
          >
            <Crosshair size={16} />
          </button>
        </div>

        {aviso && <p className="mt-2 text-xs text-amber-700">{aviso}</p>}

        {resultados.length > 0 && (
          <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-200 text-sm">
            {resultados.map((r) => (
              <li key={r.place_id}>
                <button
                  onClick={() => elegir(r)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-slate-700 last:border-0 hover:bg-slate-50"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Toca el mapa o arrastra el punto rojo para ajustarlo. Sirve para registrar la ubicación de
          otra persona sin estar allá.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <MapContainer center={pos} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <IrA pos={pos} zoom={zoom} />
          <ClicEnMapa onPos={setPos} />
          <Marker
            position={pos}
            draggable
            icon={ICONO}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPos([lat, lng]);
              },
            }}
          />
        </MapContainer>
      </div>

      <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
        <button
          onClick={onCancelar}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => onConfirmar({ lat: pos[0], lng: pos[1] })}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Check size={16} /> Confirmar esta ubicación
        </button>
      </div>
    </div>
  );
}
