import React, { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RefreshCw, Filter, MapPinOff, MessageCircle } from "lucide-react";
import { MAPA, COORD_MUNICIPIOS, MUNICIPIOS, CATEGORIAS, soloDigitos, hace } from "../lib/data.js";

// Marcadores dibujados a mano en vez de las imágenes que trae Leaflet: sus
// rutas se rompen al empaquetar, y así además se colorean por tipo y urgencia.
const punto = (color) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

const ICONOS = {
  urgente: punto("#dc2626"),
  solicitud: punto("#2563eb"),
  oferta: punto("#059669"),
};

const iconoDe = (it) =>
  it.tipo === "oferta"
    ? ICONOS.oferta
    : it.urgencia === "alta"
      ? ICONOS.urgente
      : ICONOS.solicitud;

// El mapa se crea una sola vez; para moverlo hay que hablarle desde adentro.
function Recentrar({ lat, lng, zoom }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView([lat, lng], zoom);
  }, [mapa, lat, lng, zoom]);
  return null;
}

const conCoordenadas = (it) => typeof it.lat === "number" && typeof it.lng === "number";

export default function Mapa({ solicitudes, ofertas, cargando, onRefrescar }) {
  const [verOfertas, setVerOfertas] = useState(false);
  const [fMun, setFMun] = useState("");

  const activas = useMemo(
    () => ({
      sol: solicitudes.filter((s) => s.estado !== "resuelta"),
      ofr: ofertas.filter((o) => o.estado !== "resuelta"),
    }),
    [solicitudes, ofertas]
  );

  const marcadores = useMemo(() => {
    const base = verOfertas ? [...activas.sol, ...activas.ofr] : activas.sol;
    return base
      .filter(conCoordenadas)
      .filter((it) => !fMun || it.municipio === fMun);
  }, [activas, verOfertas, fMun]);

  // Cuántas quedan fuera del mapa por no tener ubicación. Decirlo evita que el
  // mapa se lea como el total de lo que está pasando.
  const sinUbicacion = useMemo(() => {
    const base = verOfertas ? [...activas.sol, ...activas.ofr] : activas.sol;
    return base.filter((it) => !conCoordenadas(it) && (!fMun || it.municipio === fMun)).length;
  }, [activas, verOfertas, fMun]);

  const centro = fMun ? COORD_MUNICIPIOS[fMun] || MAPA.centro : MAPA.centro;
  const zoom = fMun ? MAPA.zoomMunicipio : MAPA.zoom;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mapa de necesidades</h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Dónde se está necesitando ayuda en el Quindío. Cada punto es una publicación de alguien que
        compartió su ubicación.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Filter size={15} className="text-slate-400" />
        <select
          value={fMun}
          onChange={(e) => setFMun(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none"
        >
          <option value="">Todo el Quindío</option>
          {MUNICIPIOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={verOfertas} onChange={(e) => setVerOfertas(e.target.checked)} />
          Mostrar también ofrecimientos
        </label>
        <button
          onClick={onRefrescar}
          disabled={cargando}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow" /> Urgencia alta
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow" /> Solicitud
        </span>
        {verOfertas && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-emerald-600 shadow" /> Ofrecimiento
          </span>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={centro}
          zoom={zoom}
          scrollWheelZoom
          style={{ height: "65vh", minHeight: "380px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Recentrar lat={centro[0]} lng={centro[1]} zoom={zoom} />

          {marcadores.map((it) => (
            <Marker key={it.id} position={[it.lat, it.lng]} icon={iconoDe(it)}>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {it.tipo === "solicitud" ? "Necesita" : "Ofrece"}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">
                    {it.cats.map((c) => CATEGORIAS[c]?.label || c).join(", ")}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-slate-600">{it.descripcion}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {it.municipio}{it.sector ? ` · ${it.sector}` : ""} · {hace(it.creado)}
                  </p>
                  {it.contacto && (
                    <a
                      href={"https://wa.me/57" + soloDigitos(it.contacto)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white no-underline"
                    >
                      <MessageCircle size={12} /> {it.contacto}
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-3 text-sm text-slate-500">
        {marcadores.length === 0 ? (
          <p className="flex items-start gap-2 rounded-lg border border-dashed border-slate-300 p-4">
            <MapPinOff size={16} className="mt-0.5 shrink-0 text-slate-400" />
            Todavía no hay publicaciones con ubicación en esta zona. El mapa se va llenando a medida
            que la gente marca "usar mi ubicación" al publicar.
          </p>
        ) : (
          <p>
            <strong className="text-slate-700">{marcadores.length}</strong>{" "}
            {marcadores.length === 1 ? "publicación" : "publicaciones"} en el mapa
            {sinUbicacion > 0 && (
              <span className="text-slate-400">
                {" "}· {sinUbicacion} más sin ubicación, visibles en el tablero
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
