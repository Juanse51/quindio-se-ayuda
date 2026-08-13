-- ===========================================================================
-- Quindío Se Ayuda — esquema de base de datos (Fase 2)
--
-- Cómo usarlo:
--   Supabase → tu proyecto → SQL Editor → New query → pega todo esto → Run.
--
-- Es idempotente: puedes volver a ejecutarlo sin romper nada ni borrar datos.
--
-- Modelo de permisos, en una frase: cualquiera puede leer el tablero y
-- publicar; solo las personas registradas en la tabla `coordinadores` pueden
-- borrar publicaciones y administrar el directorio y la asesoría.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

-- Solicitudes y ofrecimientos. `tipo` distingue unas de otras.
create table if not exists public.publicaciones (
  id          text primary key,
  tipo        text   not null check (tipo in ('solicitud', 'oferta')),
  nombre      text   not null default 'Anónimo' check (char_length(nombre) <= 120),
  municipio   text   not null check (char_length(municipio) <= 80),
  sector      text   not null default ''        check (char_length(sector) <= 160),
  cats        text[] not null check (cardinality(cats) between 1 and 9),
  descripcion text   not null default ''        check (char_length(descripcion) <= 2000),
  urgencia    text   not null default 'media'   check (urgencia in ('alta', 'media', 'baja')),
  contacto    text   not null default ''        check (char_length(contacto) <= 120),
  estado      text   not null default 'abierta' check (estado in ('abierta', 'en_proceso', 'resuelta')),
  creado      bigint not null,   -- epoch en milisegundos (Date.now())
  origen      text   not null default 'web' check (origen in ('web', 'importado', 'whatsapp'))
);

-- Directorio informativo: acopios, albergues y colectivos que recogen.
-- Ojo: es informativo. El equipo NO opera estos puntos.
create table if not exists public.puntos (
  id         text    primary key,
  nombre     text    not null check (char_length(nombre) <= 160),
  tipo_punto text    not null default 'acopio' check (tipo_punto in ('acopio', 'recoge', 'albergue')),
  municipio  text    not null check (char_length(municipio) <= 80),
  direccion  text    not null default '' check (char_length(direccion) <= 240),
  recibe     text    not null default '' check (char_length(recibe) <= 500),
  horario    text    not null default '' check (char_length(horario) <= 160),
  contacto   text    not null default '' check (char_length(contacto) <= 120),
  verificado boolean not null default true,
  creado     bigint  not null
);

-- Entradas de asesoría añadidas por el equipo (la guía base vive en el código).
create table if not exists public.guia (
  id     text   primary key,
  cat    text   not null default 'General' check (char_length(cat) <= 80),
  titulo text   not null check (char_length(titulo) <= 240),
  cuerpo text   not null check (char_length(cuerpo) <= 5000),
  creado bigint not null
);

-- Quién puede moderar. Se llena a mano desde el dashboard (ver README).
create table if not exists public.coordinadores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null default '',
  creado  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 2. Índices (el tablero filtra por municipio y ordena por fecha)
-- ---------------------------------------------------------------------------

create index if not exists publicaciones_tipo_creado_idx on public.publicaciones (tipo, creado desc);
create index if not exists publicaciones_municipio_idx   on public.publicaciones (municipio);
create index if not exists publicaciones_estado_idx      on public.publicaciones (estado);
create index if not exists puntos_municipio_idx          on public.puntos (municipio);
create index if not exists puntos_creado_idx             on public.puntos (creado desc);
create index if not exists guia_creado_idx               on public.guia (creado desc);


-- ---------------------------------------------------------------------------
-- 3. ¿Quién es coordinador?
--
-- SECURITY DEFINER a propósito: la función necesita leer `coordinadores`
-- saltándose RLS, si no la política de esa misma tabla se llamaría a sí misma.
-- Solo revisa la fila de quien pregunta, así que no filtra nada de nadie más.
-- ---------------------------------------------------------------------------

create or replace function public.es_coordinador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coordinadores c where c.user_id = auth.uid()
  );
$$;

revoke all on function public.es_coordinador() from public;
grant execute on function public.es_coordinador() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

alter table public.publicaciones  enable row level security;
alter table public.puntos         enable row level security;
alter table public.guia           enable row level security;
alter table public.coordinadores  enable row level security;

-- Se borran antes de crear para poder re-ejecutar el archivo entero.
drop policy if exists publicaciones_lectura       on public.publicaciones;
drop policy if exists publicaciones_insercion     on public.publicaciones;
drop policy if exists publicaciones_actualizacion on public.publicaciones;
drop policy if exists publicaciones_borrado       on public.publicaciones;

-- El tablero es público: cualquiera consulta sin registrarse.
create policy publicaciones_lectura on public.publicaciones
  for select to anon, authenticated using (true);

-- Cualquiera publica, pero solo en estado 'abierta' y sin marcarse como
-- llegado por WhatsApp (ese origen lo pondrá el bot con su propia llave).
create policy publicaciones_insercion on public.publicaciones
  for insert to anon, authenticated
  with check (estado = 'abierta' and origen in ('web', 'importado'));

-- Cambiar el estado (en proceso / resuelta) es público, igual que en la web
-- actual: los botones aparecen en cada tarjeta. Lo que impide que alguien
-- reescriba el texto o el contacto de una publicación ajena es el GRANT de
-- más abajo, que solo concede la columna `estado`.
create policy publicaciones_actualizacion on public.publicaciones
  for update to anon, authenticated using (true) with check (true);

-- Borrar es exclusivo de coordinación.
create policy publicaciones_borrado on public.publicaciones
  for delete to authenticated using (public.es_coordinador());


drop policy if exists puntos_lectura on public.puntos;
drop policy if exists puntos_escritura on public.puntos;

create policy puntos_lectura on public.puntos
  for select to anon, authenticated using (true);

create policy puntos_escritura on public.puntos
  for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());


drop policy if exists guia_lectura on public.guia;
drop policy if exists guia_escritura on public.guia;

create policy guia_lectura on public.guia
  for select to anon, authenticated using (true);

create policy guia_escritura on public.guia
  for all to authenticated using (public.es_coordinador()) with check (public.es_coordinador());


-- Cada quien solo ve su propia fila; nadie se puede agregar a sí mismo.
drop policy if exists coordinadores_propia_fila on public.coordinadores;

create policy coordinadores_propia_fila on public.coordinadores
  for select to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 5. Permisos por columna
--
-- RLS decide QUÉ FILAS se tocan; los GRANT deciden QUÉ COLUMNAS. Los dos hacen
-- falta. Sin el grant limitado de abajo, cualquier visitante anónimo podría
-- reescribir la descripción o el teléfono de una solicitud ajena.
-- ---------------------------------------------------------------------------

revoke all on public.publicaciones from anon, authenticated;
grant select, insert          on public.publicaciones to anon, authenticated;
grant update (estado)         on public.publicaciones to anon, authenticated;
grant delete                  on public.publicaciones to authenticated;

revoke all on public.puntos from anon, authenticated;
grant select                      on public.puntos to anon, authenticated;
grant insert, update, delete      on public.puntos to authenticated;

revoke all on public.guia from anon, authenticated;
grant select                      on public.guia to anon, authenticated;
grant insert, update, delete      on public.guia to authenticated;

revoke all on public.coordinadores from anon, authenticated;
grant select on public.coordinadores to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Dar acceso de coordinación a alguien
--
-- Primero crea la persona en Authentication → Users → Add user (con correo y
-- contraseña, marcando "Auto Confirm User"). Después ejecuta esto con su
-- correo, en una query aparte:
--
--   insert into public.coordinadores (user_id, nombre)
--   select id, 'Nombre de la persona' from auth.users where email = 'persona@correo.com'
--   on conflict (user_id) do nothing;
--
-- Para quitarle el acceso:
--
--   delete from public.coordinadores
--   where user_id = (select id from auth.users where email = 'persona@correo.com');
-- ---------------------------------------------------------------------------
