import React, { useState } from "react";
import { Phone, MapPin, Clock, User, HandHeart, ChevronRight, Check, Trash2, MessageCircle, ShieldCheck, LoaderCircle } from "lucide-react";
import { ACENTO, URGENCIAS, ESTADOS, soloDigitos, hace } from "../lib/data.js";
import { Chip, CatChip, Galeria } from "./ui.jsx";

export default function Tarjeta({ item, compatibles, onEstado, onVerCompatibles, onEliminar, onPedirContacto }) {
  const [verContacto, setVerContacto] = useState(false);
  // Las ofertas llegan sin teléfono: la vista pública lo deja nulo a propósito.
  // Coordinación lo pide aparte y se guarda aquí solo mientras dura la sesión.
  const [contacto, setContacto] = useState(item.contacto || null);
  const [pidiendo, setPidiendo] = useState(false);
  const [errorContacto, setErrorContacto] = useState("");
  const esSol = item.tipo === "solicitud";
  const a = ACENTO[item.tipo];
  const linkWa = "https://wa.me/57" + soloDigitos(contacto);

  const pedirContacto = async () => {
    if (pidiendo) return;
    setPidiendo(true);
    setErrorContacto("");
    try {
      const c = await onPedirContacto(item.id);
      if (c) {
        setContacto(c);
        setVerContacto(true);
      } else {
        setErrorContacto("No se pudo obtener el contacto.");
      }
    } catch (e) {
      setErrorContacto(e.message);
    } finally {
      setPidiendo(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${a.badge}`}>{esSol ? "Necesita" : "Ofrece"}</span>
          <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
            <MapPin size={13} className="text-slate-400" />
            {item.municipio}{item.sector ? ` · ${item.sector}` : ""}
          </span>
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-400"><Clock size={12} /> {hace(item.creado)}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.cats.map((c) => <CatChip key={c} cat={c} />)}
        {esSol && URGENCIAS[item.urgencia] && <Chip className={URGENCIAS[item.urgencia].chip}>Urgencia {URGENCIAS[item.urgencia].label.toLowerCase()}</Chip>}
        <Chip className={ESTADOS[item.estado].chip}>{ESTADOS[item.estado].label}</Chip>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">{item.descripcion}</p>

      <Galeria imagenes={item.imagenes} alt={`Foto de la publicación de ${item.nombre}`} className="mt-3" />

      <div className="mt-3 flex items-center gap-1 text-sm text-slate-500"><User size={13} /> {item.nombre}</div>

      {esSol && compatibles > 0 && item.estado === "abierta" && (
        <button onClick={onVerCompatibles} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline">
          <HandHeart size={14} /> {compatibles} ofrecimiento{compatibles > 1 ? "s" : ""} compatible{compatibles > 1 ? "s" : ""}<ChevronRight size={14} />
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {contacto && verContacto ? (
          <a href={linkWa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
            <MessageCircle size={14} /> {contacto}
          </a>
        ) : contacto ? (
          <button onClick={() => setVerContacto(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Phone size={14} /> Mostrar contacto
          </button>
        ) : onPedirContacto ? (
          <button onClick={pedirContacto} disabled={pidiendo} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {pidiendo ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Ver contacto
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} className="text-slate-400" />
            Contacto reservado · coordinación hace el enlace
          </span>
        )}
        {errorContacto && <span className="text-xs font-medium text-red-600">{errorContacto}</span>}
        <div className="ml-auto flex gap-1">
          {item.estado !== "en_proceso" && <button onClick={() => onEstado(item, "en_proceso")} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">En proceso</button>}
          {item.estado !== "resuelta" && <button onClick={() => onEstado(item, "resuelta")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"><Check size={13} /> Resuelta</button>}
          {onEliminar && <button onClick={() => onEliminar(item)} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>}
        </div>
      </div>
    </div>
  );
}
