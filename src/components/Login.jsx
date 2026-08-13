import React, { useState } from "react";
import { Lock } from "lucide-react";
import { inputCls } from "../lib/data.js";
import { hayBackend } from "../lib/supabase.js";

export default function Login({ onEntrar }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  const enviar = async () => {
    if (entrando) return;
    if (hayBackend && !correo.trim()) return setError("Escribe tu correo.");
    if (!clave) return setError("Escribe tu contraseña.");
    setError("");
    setEntrando(true);
    try {
      await onEntrar(correo, clave);
    } catch (e) {
      setError(e.message);
      setEntrando(false);
    }
  };

  const alTeclear = (e) => {
    if (e.key === "Enter") enviar();
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white">
          <Lock size={22} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Panel de coordinación</h2>
        <p className="mt-1 text-sm text-slate-500">Acceso solo para el equipo.</p>

        <div className="mt-4 space-y-2">
          {hayBackend && (
            <input
              type="email"
              autoComplete="username"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              onKeyDown={alTeclear}
              placeholder="Correo"
              className={inputCls + " text-center"}
            />
          )}
          <input
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            onKeyDown={alTeclear}
            placeholder={hayBackend ? "Contraseña" : "Clave"}
            className={inputCls + " text-center"}
          />
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={enviar}
          disabled={entrando}
          className="mt-3 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {entrando ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-3 text-xs text-slate-400">
          {hayBackend
            ? "Las cuentas de coordinación las crea el equipo. Si no tienes uno, pídelo."
            : "Modo local: la clave está en el código. Al conectar la base de datos se usa correo y contraseña."}
        </p>
      </div>
    </div>
  );
}
