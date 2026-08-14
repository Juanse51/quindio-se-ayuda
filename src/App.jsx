import React, { useState, useEffect, useCallback, Suspense } from "react";
import { AlertTriangle, Heart, Building2, BookOpen, HandHeart, Lock, Database, X, Map, Home } from "lucide-react";
import { store } from "./lib/storage.js";
import { auth } from "./lib/auth.js";
import { hayBackend } from "./lib/supabase.js";
import Formulario from "./components/Formulario.jsx";
import Tablero from "./components/Tablero.jsx";
import Directorio from "./components/Directorio.jsx";
import Asesoria from "./components/Asesoria.jsx";
import Arriendos from "./components/Arriendos.jsx";
import FormArriendo from "./components/FormArriendo.jsx";
import PanelCoord from "./components/PanelCoord.jsx";
import Login from "./components/Login.jsx";
import Tarjeta from "./components/Tarjeta.jsx";
import { AlAparecer } from "./components/ui.jsx";

// Leaflet y sus estilos pesan bastante y la mayoría de visitas no abren el
// mapa. Se descarga solo cuando alguien entra a esa vista.
const Mapa = React.lazy(() => import("./components/Mapa.jsx"));

export default function App() {
  const [view, setView] = useState("inicio");
  const [solicitudes, setSolicitudes] = useState([]);
  const [ofertas, setOfertas] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [guiaExtra, setGuiaExtra] = useState([]);
  const [arriendos, setArriendos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroInicial, setFiltroInicial] = useState(null);
  const [sesion, setSesion] = useState(null);
  const [errorApp, setErrorApp] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [s, o, p, g, a] = await Promise.all([
        store.listar("sol:"), store.listar("ofr:"), store.listar("aco:"),
        store.listar("gui:"), store.listar("arr:"),
      ]);
      setSolicitudes(s); setOfertas(o); setPuntos(p); setGuiaExtra(g); setArriendos(a);
      setErrorApp("");
    } catch (e) {
      setErrorApp(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Sesión de coordinación: se restaura al abrir y se sigue si caduca o se
  // cierra desde otra pestaña.
  useEffect(() => {
    auth.sesion().then(setSesion).catch(() => setSesion(null));
    return auth.alCambiar(setSesion);
  }, []);

  // Si la sesión se pierde estando en el panel, se sale del panel.
  useEffect(() => {
    if (view === "coord" && !sesion?.coordinador) setView("inicio");
  }, [view, sesion]);

  // Para acciones sin interfaz propia de error (botones de las tarjetas):
  // avisa arriba y recarga para que lo que se ve coincida con lo guardado.
  const conAviso = async (fn) => {
    try {
      setErrorApp("");
      await fn();
    } catch (e) {
      setErrorApp(e.message);
      cargar();
    }
  };

  const prefijoDe = (item) => (item.tipo === "solicitud" ? "sol:" : "ofr:");
  const setterDe = (item) => (item.tipo === "solicitud" ? setSolicitudes : setOfertas);

  // Estas propagan el error a propósito: quien las llama tiene su propia forma
  // de mostrarlo (el formulario, el importador, los editores del panel).
  const publicar = async (item) => {
    await store.guardar(prefijoDe(item), item);
    setterDe(item)((p) => [item, ...p]);
    setFiltroInicial({ pestana: item.tipo, municipio: item.municipio });
    setView("tablero");
  };

  const publicarArriendo = async (item) => {
    await store.guardar("arr:", item);
    setArriendos((p) => [item, ...p]);
    setView("arriendos");
  };

  const importar = async (filas) => {
    const sols = filas.filter((f) => f.tipo === "solicitud");
    const ofrs = filas.filter((f) => f.tipo === "oferta");
    if (sols.length) await store.guardar("sol:", sols);
    if (ofrs.length) await store.guardar("ofr:", ofrs);
    setSolicitudes((p) => [...sols, ...p]);
    setOfertas((p) => [...ofrs, ...p]);
  };

  const guardarPunto = async (p) => { await store.guardar("aco:", p); setPuntos((x) => [p, ...x]); };
  const eliminarPunto = async (p) => { await store.eliminar("aco:", p.id); setPuntos((x) => x.filter((y) => y.id !== p.id)); };
  const guardarGuia = async (g) => { await store.guardar("gui:", g); setGuiaExtra((x) => [g, ...x]); };
  const eliminarGuia = async (g) => { await store.eliminar("gui:", g.id); setGuiaExtra((x) => x.filter((y) => y.id !== g.id)); };

  const cambiarEstado = (item, estado) => conAviso(async () => {
    await store.actualizarEstado(prefijoDe(item), item.id, estado);
    setterDe(item)((p) => p.map((x) => (x.id === item.id ? { ...x, estado } : x)));
  });

  const eliminarPub = (item) => conAviso(async () => {
    await store.eliminar(prefijoDe(item), item.id);
    setterDe(item)((p) => p.filter((x) => x.id !== item.id));
  });

  const cambiarEstadoArriendo = (item, estado) => conAviso(async () => {
    await store.actualizarEstado("arr:", item.id, estado);
    setArriendos((p) => p.map((x) => (x.id === item.id ? { ...x, estado } : x)));
  });

  const eliminarArriendo = (item) => conAviso(async () => {
    await store.eliminar("arr:", item.id);
    setArriendos((p) => p.filter((x) => x.id !== item.id));
  });

  // El teléfono de quien ofrece ayuda no llega con la publicación; coordinación
  // lo pide de a uno y el servidor comprueba que quien pregunta tenga permiso.
  const pedirContacto = (id) => store.contactoDe(id);

  const entrar = async (correo, clave) => {
    setSesion(await auth.entrar(correo, clave));
    setView("coord");
  };

  const salir = async () => {
    await auth.salir();
    setSesion(null);
    setView("inicio");
  };

  // `solicitudes` ya viene de la más nueva a la más vieja.
  const solicitudesRecientes = solicitudes.filter((s) => s.estado === "abierta").slice(0, 6);

  const nav = [
    ["tablero", "Tablero"], ["mapa", "Mapa"], ["directorio", "Directorio"],
    ["arriendos", "Arriendos"], ["asesoria", "Asesoría"],
  ];
  const irCoord = () => setView(sesion?.coordinador ? "coord" : "login");

  const atajos = [
    { v: "pedir", Icon: AlertTriangle, titulo: "Necesito ayuda", sub: "Agua, alimentos, refugio, medicinas…", caja: "border-blue-200 bg-blue-50 hover:border-blue-400", icono: "bg-blue-600", texto: "text-blue-900", subTexto: "text-blue-800/80" },
    { v: "ofrecer", Icon: Heart, titulo: "Puedo ayudar", sub: "Ofrece insumos, transporte o tu tiempo.", caja: "border-emerald-200 bg-emerald-50 hover:border-emerald-400", icono: "bg-emerald-600", texto: "text-emerald-900", subTexto: "text-emerald-800/80" },
    { v: "mapa", Icon: Map, titulo: "Mapa de necesidades", sub: "Dónde se está pidiendo ayuda.", caja: "border-slate-200 bg-white hover:border-slate-400", icono: "bg-rose-500", texto: "text-slate-900", subTexto: "text-slate-500" },
    { v: "directorio", Icon: Building2, titulo: "Dónde llevar cosas", sub: "Acopios y quién está recogiendo.", caja: "border-slate-200 bg-white hover:border-slate-400", icono: "bg-slate-700", texto: "text-slate-900", subTexto: "text-slate-500" },
    { v: "arriendos", Icon: Home, titulo: "Arriendos", sub: "Casas y apartamentos disponibles.", caja: "border-slate-200 bg-white hover:border-slate-400", icono: "bg-violet-600", texto: "text-slate-900", subTexto: "text-slate-500" },
    { v: "asesoria", Icon: BookOpen, titulo: "Asesoría", sub: "Qué hacer y a quién acudir.", caja: "border-slate-200 bg-white hover:border-slate-400", icono: "bg-amber-500", texto: "text-slate-900", subTexto: "text-slate-500" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <button onClick={() => setView("inicio")} className="flex items-center gap-2 text-left">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><HandHeart size={20} /></div>
            <div>
              <p className="text-base font-bold leading-tight tracking-tight">Quindío Se Ayuda</p>
              <p className="text-xs text-slate-500">Red de ayuda mutua tras el sismo</p>
            </div>
          </button>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav.map(([v, l]) => (
              <button key={v} onClick={() => { setFiltroInicial(null); setView(v); }} className={`rounded-lg px-3 py-1.5 font-medium ${view === v ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>
            ))}
            <button onClick={irCoord} className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"><Lock size={13} /> Coordinación</button>
          </nav>
        </div>
      </header>

      {errorApp && (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-2.5 text-sm text-red-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="leading-snug">{errorApp}</p>
            <button onClick={() => setErrorApp("")} className="ml-auto shrink-0 text-red-400 hover:text-red-700"><X size={16} /></button>
          </div>
        </div>
      )}

      {view === "inicio" && (
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">Ayudar y pedir ayuda, en un solo lugar.</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Una red vecinal para el Quindío tras el sismo del 10 de agosto. Publica lo que necesitas o lo que puedes ofrecer, encuentra dónde llevar donaciones y consulta la guía de qué hacer.</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {atajos.map(({ v, Icon, titulo, sub, caja, icono, texto, subTexto }) => (
              <button key={v} onClick={() => setView(v)} className={`group rounded-2xl border p-5 text-left transition hover:shadow-md ${caja}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${icono}`}><Icon size={22} /></div>
                <h2 className={`mt-4 text-lg font-semibold ${texto}`}>{titulo}</h2>
                <p className={`mt-1 text-sm ${subTexto}`}>{sub}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-500">
            <span><strong className="text-slate-800">{solicitudes.filter((s) => s.estado === "abierta").length}</strong> solicitudes abiertas</span>
            <span><strong className="text-slate-800">{ofertas.filter((o) => o.estado === "abierta").length}</strong> ofrecimientos activos</span>
            <span><strong className="text-slate-800">{puntos.length}</strong> puntos en el directorio</span>
            <span><strong className="text-slate-800">{arriendos.filter((a) => a.estado === "disponible").length}</strong> viviendas en arriendo</span>
          </div>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Quién está pidiendo ayuda ahora</h2>
                <p className="mt-1 text-sm text-slate-500">Las solicitudes más recientes. Si puedes con alguna, escríbele directo.</p>
              </div>
              <button
                onClick={() => { setFiltroInicial(null); setView("tablero"); }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
              >
                Ver todas
              </button>
            </div>

            {solicitudesRecientes.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {solicitudesRecientes.map((s) => (
                  <Tarjeta key={s.id} item={s} compatibles={0} onEstado={cambiarEstado} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Todavía no hay solicitudes abiertas. Cuando alguien publique, aparecerá aquí.
              </p>
            )}
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Dónde se está necesitando ayuda</h2>
                <p className="mt-1 text-sm text-slate-500">Cada punto es alguien que compartió su ubicación al publicar.</p>
              </div>
              <button
                onClick={() => setView("mapa")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
              >
                Ver mapa completo
              </button>
            </div>
            <div className="mt-4">
              <AlAparecer alto={360}>
                <Suspense fallback={<div className="h-[360px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />}>
                  <Mapa solicitudes={solicitudes} ofertas={ofertas} cargando={cargando} onRefrescar={cargar} compacto />
                </Suspense>
              </AlAparecer>
            </div>
          </section>

          {!hayBackend && (
            <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-center gap-1.5 font-semibold"><Database size={15} /> Modo local, sin base de datos</p>
              <p className="mt-1 text-amber-800">Lo que publiques se guarda solo en este navegador y nadie más lo verá. Falta configurar las credenciales de Supabase en el archivo <code className="rounded bg-amber-100 px-1">.env</code>. Ver README.md.</p>
            </div>
          )}
        </main>
      )}

      {view === "pedir" && <Formulario tipo="solicitud" onEnviar={publicar} onCancelar={() => setView("inicio")} />}
      {view === "ofrecer" && <Formulario tipo="oferta" onEnviar={publicar} onCancelar={() => setView("inicio")} />}
      {view === "tablero" && <Tablero solicitudes={solicitudes} ofertas={ofertas} onEstado={cambiarEstado} onRefrescar={cargar} cargando={cargando} filtroInicial={filtroInicial} />}
      {view === "directorio" && <Directorio puntos={puntos} cargando={cargando} onRefrescar={cargar} />}
      {view === "asesoria" && <Asesoria extra={guiaExtra} />}
      {view === "publicarArriendo" && <FormArriendo onEnviar={publicarArriendo} onCancelar={() => setView("arriendos")} />}
      {view === "login" && <Login onEntrar={entrar} />}

      {view === "arriendos" && (
        <Arriendos
          arriendos={arriendos} cargando={cargando} onRefrescar={cargar}
          onPublicar={() => setView("publicarArriendo")}
          onEstado={cambiarEstadoArriendo} onEliminar={eliminarArriendo}
        />
      )}

      {view === "mapa" && (
        <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-slate-500">Cargando el mapa…</p>}>
          <Mapa solicitudes={solicitudes} ofertas={ofertas} cargando={cargando} onRefrescar={cargar} />
        </Suspense>
      )}

      {view === "coord" && sesion?.coordinador && (
        <PanelCoord
          solicitudes={solicitudes} ofertas={ofertas} puntos={puntos} guiaExtra={guiaExtra} arriendos={arriendos}
          onImportar={importar} onGuardarPunto={guardarPunto} onEliminarPunto={eliminarPunto}
          onGuardarGuia={guardarGuia} onEliminarGuia={eliminarGuia} onEstado={cambiarEstado}
          onEliminarPub={eliminarPub} onRefrescar={cargar} cargando={cargando}
          onEstadoArriendo={cambiarEstadoArriendo} onEliminarArriendo={eliminarArriendo}
          onPedirContacto={pedirContacto} sesion={sesion} onSalir={salir}
        />
      )}

      <footer className="mt-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>Quindío Se Ayuda · Herramienta comunitaria sin ánimo de lucro · Emergencias: 123</p>
        <p className="mt-1">
          Sitio creado por{" "}
          <a href="https://vamosarayar.com" target="_blank" rel="noreferrer" className="font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800">
            Rayar!
          </a>
        </p>
      </footer>
    </div>
  );
}
