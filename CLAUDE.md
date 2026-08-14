# Quindío Se Ayuda — Contexto del proyecto

Este archivo le da contexto a Claude Code. Léelo antes de hacer cambios.

## Qué es

Plataforma de ayuda mutua para el departamento del Quindío (Colombia) tras el
sismo del 10 de agosto de 2026. La gente **publica** necesidades u ofrecimientos
y **consulta** información, desde dos puertas —web y (más adelante) WhatsApp—
que escriben en una sola base de datos.

## Principios que no se deben romper

- **Complementar lo oficial, no reemplazarlo.** Toda emergencia vital se dirige
  al 123. La plataforma NO coordina rescates. El 123 se mantiene visible en el
  pie de página.
  - El banner rojo *"¿Alguien en peligro de muerte?"* se quitó por decisión del
    equipo: no hay personas bajo escombros y la necesidad es humanitaria, así
    que la alarma no correspondía a la situación. No reponerlo sin acordarlo.
- **El bot de WhatsApp (fase futura) responde solo con contenido curado**, no
  genera información libre.
- **Privacidad:** los contactos no se exponen sin necesidad.
- **La moderación es posterior, por decisión de producto.** Lo que alguien
  publica queda visible de inmediato; coordinación borra después si hace falta.
  Se evaluó la aprobación previa y se descartó: en emergencia, un tablero que
  tarda horas en mostrar lo publicado se lee como una plataforma que no sirve.
  No implementar cola de aprobación sin acordarlo con el equipo.

## Contexto que condiciona el diseño

1. El equipo NO opera puntos de acopio: solo informa dónde hay y quién recoge
   (el Directorio es informativo, no un inventario propio).
2. No hay heridos ni personas bajo escombros: el enfoque no es rescate.
3. Ya existe mucha data de solicitudes/ofrecimientos: la plataforma debe poder
   importarla (ver panel de coordinación → importación CSV).

## Estado actual — FASE 2 completa, FASE 3 parcial

Web funcional con:
- **M1** Pedir / ofrecer ayuda + tablero con filtros y emparejamiento por
  cercanía y categoría. Cada publicación admite **foto** y **ubicación**.
- **M2** Directorio informativo de acopios / albergues / colectivos.
- **M3 (básico)** Asesoría: guía consultable con contenido base editable.
- **M4 (vivienda)** Arriendos: casas y apartamentos disponibles en todo el
  departamento. Solo ofertas; quien busca, filtra por municipio, tipo y precio.
- **Mapa** del Quindío con un punto por publicación que tenga coordenadas.
- **Panel de coordinación**: importación CSV de la data existente, moderación de
  publicaciones y de arriendos, edición del directorio y de la asesoría.
- **Base de datos real (Supabase)** con RLS: los datos se comparten entre todas
  las personas. Ver `supabase/schema.sql`.
- **Autenticación real del panel**: correo y contraseña + pertenencia a la tabla
  `coordinadores`, verificada también del lado del servidor.
- **En producción** en https://quindioayuda.com (Vercel, desplegado desde
  GitHub: cada push a `main` reconstruye y publica solo).

Falta de la Fase 2: el bot de WhatsApp.

### Decisiones tomadas sobre estas funciones

- **Las coordenadas son exactas, no aproximadas.** Se planteó difuminarlas para
  no publicar la dirección precisa de alguien vulnerable junto a su teléfono, y
  el equipo eligió precisión. Compartir la ubicación es opcional y el formulario
  dice claramente que el punto queda público.
- **Las fotos se comprimen en el navegador antes de subirse** (máx. 1280 px,
  JPEG 0.72). No es cosmético: esto se usa desde celulares con mala señal y una
  foto de cámara pesa varios MB. Ver `src/lib/imagenes.js`.
- **El mapa se carga bajo demanda** (`React.lazy`). Leaflet añade ~47 kB gzip y
  la mayoría de visitas no abren el mapa.

### Producción

- Repositorio: https://github.com/Juanse51/quindio-se-ayuda
- Dominio: `quindioayuda.com` (comprado en Hostinger, DNS editado allí; los
  nameservers siguen siendo los de Hostinger para no tumbar el correo).
  El apex redirige a `www`, que es el canónico.
- Las variables `VITE_SUPABASE_*` están configuradas en Vercel. Vite las
  incrusta **al construir**, no las lee al arrancar: si se cambian, hay que
  redesplegar, no basta con reiniciar.

### Los dos modos de ejecución

La app funciona con o sin credenciales, y lo dice en la interfaz:

- **Con `.env` configurado** → Supabase. Es el modo real.
- **Sin `.env`** → `localStorage` y la clave `CLAVE_COORD`. Solo para trabajar en
  la interfaz sin conectarse a nada; los datos no se comparten.

Al tocar `storage.js` o `auth.js` hay que mantener las dos implementaciones en
pie, o el modo local deja de arrancar.

## Arquitectura del código

```
src/
  main.jsx              Punto de entrada
  App.jsx               Orquesta vistas y estado; contiene la lógica de datos
  index.css             Tailwind
  lib/
    data.js             Constantes, catálogos, contenido base, utilidades
    supabase.js         Cliente; `hayBackend` dice si hay credenciales
    storage.js          Capa de almacenamiento (Supabase | localStorage)
    auth.js             Sesión de coordinación (Supabase Auth | clave local)
    imagenes.js         Comprime y sube fotos (bucket | data URL en modo local)
  components/
    ui.jsx              Chip, CatChip, Campo, SelectorImagen, SelectorUbicacion
    Formulario.jsx      Pedir / ofrecer
    Tarjeta.jsx         Tarjeta de una publicación
    Tablero.jsx         Lista con filtros + emparejamiento
    Directorio.jsx      M2
    Asesoria.jsx        M3 básico
    Mapa.jsx            Mapa del Quindío (Leaflet). Se carga con React.lazy
    Arriendos.jsx       M4 vivienda: listado con filtros (reusado en el panel)
    FormArriendo.jsx    Publicar una vivienda
    PanelCoord.jsx      Panel de coordinación (incluye editores)
    Login.jsx           Entrada al panel
supabase/
  schema.sql            Tablas, índices, RLS y permisos. Idempotente.
scripts/
  verificar-supabase.mjs  `npm run verificar`: credenciales, tablas y permisos
```

### Modelo de datos (objetos guardados)

Los prefijos de la Fase 1 se conservan como nombre de colección y el adaptador
los traduce a tablas: `sol:`/`ofr:` → `publicaciones` (filtrando por `tipo`),
`aco:` → `puntos`, `gui:` → `guia`, `arr:` → `arriendos`.

- Publicación (solicitud/oferta): `{ id, tipo, nombre, municipio, sector, cats[],
  descripcion, urgencia, contacto, imagen, lat, lng, estado, creado, origen }`
- Punto de directorio: `{ id, nombre, tipoPunto, municipio, direccion, recibe,
  horario, contacto, verificado, creado }`
- Asesoría: `{ id, cat, titulo, cuerpo, creado }`
- Arriendo: `{ id, tipo, nombre, municipio, sector, habitaciones, banos, precio,
  amoblado, descripcion, contacto, imagen, estado, creado, origen }`

`id` lo genera el cliente con `uid()` y `creado` es `Date.now()` (bigint), no
timestamp de Postgres. En la base, `tipoPunto` se llama `tipo_punto`; la
traducción vive en `storage.js`.

`imagen` guarda el **nombre del archivo** dentro del bucket `imagenes`, no una
URL; `urlImagen()` la construye al mostrarla. En modo local guarda un data URL,
y esa misma función lo devuelve tal cual. `lat`/`lng` son nulos cuando la
persona no compartió su ubicación, que es lo normal.

Los estados dependen de la colección: `abierta | en_proceso | resuelta` para
publicaciones, `disponible | arrendado` para arriendos.

### Interfaz de `storage.js`

```
listar(prefijo)                       → array, del más nuevo al más viejo
guardar(prefijo, item | items[])      → crea (acepta lote, lo usa la importación)
actualizarEstado(prefijo, id, estado) → solo cambia el estado
eliminar(prefijo, id)                 → borra
```

`actualizarEstado` existe aparte a propósito: quien no está autenticado solo
tiene permiso sobre la columna `estado`, así que un guardado completo fallaría.

**Los errores se lanzan, no se silencian.** Con una base remota un guardado
puede fallar de verdad, y la persona tiene que enterarse en vez de creer que
publicó. Cada quien los muestra donde toca: el formulario y los editores en su
propio recuadro, el resto en la franja roja de `App.jsx`.

## Cómo correr

```bash
npm install
cp .env.example .env   # y pegar las credenciales de Supabase
npm run verificar      # comprueba tablas y permisos contra el proyecto real
npm run dev
```

Sin `.env` arranca igual, en modo local. Ver README.md.

## Próximos pasos (roadmap)

**Fase 2 — Producción y WhatsApp**
- ~~Base de datos real manteniendo la interfaz de `storage.js`.~~ Hecho.
- ~~Autenticación real para el panel.~~ Hecho.
- Bot de WhatsApp (webhook + IA que estructura mensajes y responde con la base
  de conocimiento) escribiendo en la misma base. El esquema ya lo contempla:
  `origen = 'whatsapp'` está reservado para el bot, que debe escribir con la
  `service_role key` desde el servidor —nunca desde el navegador.
- ~~Desplegar.~~ Hecho: Vercel + dominio propio.

**Pendientes conocidos de la Fase 2**
- Cualquier visitante puede marcar una publicación ajena como resuelta. Se
  heredó de la Fase 1 y hoy es una decisión de producto, no un descuido: si se
  vuelve un problema, el arreglo es quitar el permiso `update (estado)` de
  `anon` y dejar ese cambio solo en manos de coordinación.
- Los contactos viajan al navegador junto con cada publicación. Para exponerlos
  solo bajo demanda haría falta una vista sin la columna `contacto` más una
  función que la entregue de a una.
- El cliente de Supabase duplicó el tamaño del bundle (66 → 129 kB gzip), y esto
  se usa desde celulares con mala señal. El mapa no cuenta ahí: va en su propio
  archivo de 47 kB que solo se descarga al abrirlo.
- Las fotos se suben antes de guardar la publicación. Si la publicación falla
  después, la imagen queda huérfana en el bucket. No hay limpieza automática.
- Nadie puede borrar su propia foto: el permiso de borrado en el bucket es solo
  de coordinación. Borrar la publicación no borra la imagen.

**Fase 3 — Clasificados, reportes y mapa**
- ~~M4 Clasificados: vivienda.~~ Hecho (solo ofertas de arriendo).
- M4 Clasificados: personas (con moderación), mascotas.
- M5 Reportes ciudadanos (buzón que llega al panel).
- ~~Mapa de necesidades.~~ Hecho. Falta el mapa del directorio (los puntos de
  acopio no tienen coordenadas todavía).

## Convenciones

- Idioma de la interfaz y del código de dominio: español.
- Estilos con Tailwind; usar clases completas (no construir nombres de clase por
  concatenación de fragmentos, o Tailwind no los detecta).
- Íconos: lucide-react.
