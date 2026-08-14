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
  -- Nombres de archivo dentro del bucket `imagenes`. Vacío si no subió ninguna.
  imagenes    text[] not null default '{}' check (cardinality(imagenes) <= 6),
  lat         double precision,  -- ubicación exacta, opcional
  lng         double precision,
  -- Autorización explícita para tratar los datos personales de la publicación.
  consentimiento boolean not null default false,
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

-- Clasificados de vivienda: casas y apartamentos disponibles en arriendo.
-- Solo ofertas; quien busca, filtra. No hay publicaciones de "busco arriendo".
create table if not exists public.arriendos (
  id           text     primary key,
  tipo         text     not null default 'apartamento'
                        check (tipo in ('casa', 'apartamento', 'habitacion', 'finca')),
  nombre       text     not null default 'Anónimo' check (char_length(nombre) <= 120),
  municipio    text     not null check (char_length(municipio) <= 80),
  sector       text     not null default '' check (char_length(sector) <= 160),
  habitaciones smallint not null default 1 check (habitaciones between 0 and 20),
  banos        smallint not null default 1 check (banos between 0 and 20),
  precio       integer  check (precio is null or precio between 0 and 100000000),
  amoblado     boolean  not null default false,
  descripcion  text     not null default '' check (char_length(descripcion) <= 2000),
  contacto     text     not null default '' check (char_length(contacto) <= 120),
  imagenes     text[]   not null default '{}' check (cardinality(imagenes) <= 6),
  estado       text     not null default 'disponible'
                        check (estado in ('disponible', 'arrendado')),
  creado       bigint   not null,
  origen       text     not null default 'web' check (origen in ('web', 'importado', 'whatsapp'))
);

-- Quién puede moderar. Se llena a mano desde el dashboard (ver README).
create table if not exists public.coordinadores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre  text not null default '',
  creado  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 1b. Ajustes para bases creadas antes de la Fase 3
--
-- `create table if not exists` no toca una tabla que ya existe, así que las
-- columnas nuevas se agregan aparte. Si la base es nueva, esto no hace nada.
-- ---------------------------------------------------------------------------

-- La vista depende de las columnas de abajo, así que estorba para migrarlas.
-- Se recrea más adelante, en la sección 5a.
drop view if exists public.publicaciones_publicas;

alter table public.publicaciones add column if not exists lat double precision;
alter table public.publicaciones add column if not exists lng double precision;
alter table public.publicaciones add column if not exists consentimiento boolean not null default false;
alter table public.publicaciones add column if not exists imagenes text[] not null default '{}';
alter table public.arriendos    add column if not exists imagenes text[] not null default '{}';

-- Paso de una foto por publicación a varias. Se conserva la que hubiera y
-- después se elimina la columna vieja. En una base nueva no hace nada.
do $$
declare
  t text;
begin
  foreach t in array array['publicaciones', 'arriendos'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'imagen'
    ) then
      execute format(
        'update public.%I set imagenes = array[imagen]
          where imagen is not null and cardinality(imagenes) = 0', t
      );
      execute format('alter table public.%I drop column imagen', t);
    end if;
  end loop;
end $$;

-- Postgres no tiene `add constraint if not exists`, de ahí el rodeo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'publicaciones_lat_valida') then
    alter table public.publicaciones add constraint publicaciones_lat_valida
      check (lat is null or lat between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'publicaciones_lng_valida') then
    alter table public.publicaciones add constraint publicaciones_lng_valida
      check (lng is null or lng between -180 and 180);
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Índices (el tablero filtra por municipio y ordena por fecha)
-- ---------------------------------------------------------------------------

create index if not exists publicaciones_tipo_creado_idx on public.publicaciones (tipo, creado desc);
create index if not exists publicaciones_municipio_idx   on public.publicaciones (municipio);
create index if not exists publicaciones_estado_idx      on public.publicaciones (estado);
create index if not exists puntos_municipio_idx          on public.puntos (municipio);
create index if not exists puntos_creado_idx             on public.puntos (creado desc);
create index if not exists guia_creado_idx               on public.guia (creado desc);
create index if not exists arriendos_creado_idx          on public.arriendos (creado desc);
create index if not exists arriendos_municipio_idx       on public.arriendos (municipio);

-- El mapa solo pide las filas que tienen coordenadas.
create index if not exists publicaciones_geo_idx
  on public.publicaciones (lat, lng) where lat is not null;


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
alter table public.arriendos      enable row level security;
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
  with check (
    estado = 'abierta'
    and origen in ('web', 'importado')
    -- Sin autorización de datos no se publica. La data que ya existía y entra
    -- por el importador del panel no pasó por el formulario: ese consentimiento
    -- lo respalda el equipo que la recogió.
    and (consentimiento = true or origen = 'importado')
  );

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


-- Arriendos: mismo trato que las publicaciones. Cualquiera ofrece una vivienda
-- y puede marcarla como arrendada; borrar es de coordinación.
drop policy if exists arriendos_lectura       on public.arriendos;
drop policy if exists arriendos_insercion     on public.arriendos;
drop policy if exists arriendos_actualizacion on public.arriendos;
drop policy if exists arriendos_borrado       on public.arriendos;

create policy arriendos_lectura on public.arriendos
  for select to anon, authenticated using (true);

create policy arriendos_insercion on public.arriendos
  for insert to anon, authenticated
  with check (estado = 'disponible' and origen in ('web', 'importado'));

create policy arriendos_actualizacion on public.arriendos
  for update to anon, authenticated using (true) with check (true);

create policy arriendos_borrado on public.arriendos
  for delete to authenticated using (public.es_coordinador());


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

-- Ojo con la lista de columnas: `contacto` NO está. Nadie lee esa columna
-- directamente desde el navegador; se llega a ella por la vista de más abajo
-- (que la muestra solo en las solicitudes) o por la función para coordinación.
revoke all on public.publicaciones from anon, authenticated;
grant select (id, tipo, nombre, municipio, sector, cats, descripcion, urgencia,
              imagenes, lat, lng, estado, creado, origen)
                              on public.publicaciones to anon, authenticated;
grant insert                  on public.publicaciones to anon, authenticated;
grant update (estado)         on public.publicaciones to anon, authenticated;
grant delete                  on public.publicaciones to authenticated;

revoke all on public.puntos from anon, authenticated;
grant select                      on public.puntos to anon, authenticated;
grant insert, update, delete      on public.puntos to authenticated;

revoke all on public.guia from anon, authenticated;
grant select                      on public.guia to anon, authenticated;
grant insert, update, delete      on public.guia to authenticated;

revoke all on public.arriendos from anon, authenticated;
grant select, insert          on public.arriendos to anon, authenticated;
grant update (estado)         on public.arriendos to anon, authenticated;
grant delete                  on public.arriendos to authenticated;

revoke all on public.coordinadores from anon, authenticated;
grant select on public.coordinadores to authenticated;


-- ---------------------------------------------------------------------------
-- 5a. Qué contacto es público y cuál no
--
-- Regla: el teléfono de quien PIDE ayuda es público —es la única forma de que
-- alguien lo alcance—. El de quien OFRECE ayuda no: queda guardado para
-- coordinación, que hace el enlace.
--
-- Esto no se puede resolver con permisos por columna, porque son por tabla y
-- no distinguen filas. La solución son dos caminos distintos al mismo dato:
--
--   * la vista de abajo, que el navegador lee y que devuelve `contacto` nulo
--     en las ofertas;
--   * la función `contacto_privado()`, que solo responde a coordinación.
--
-- La vista corre con los permisos de su dueño (postgres), por eso puede leer
-- la columna que anon ya no puede leer. Es deliberado: es justo el mecanismo
-- que permite filtrar el dato en vez de exponerlo entero.
-- ---------------------------------------------------------------------------

-- Se recrea desde cero en vez de `create or replace`: esa forma no admite
-- cambios en el tipo de una columna, y `imagen` pasó a ser el arreglo
-- `imagenes`. La vista ya se eliminó en la sección 1b.
create view public.publicaciones_publicas as
select
  id, tipo, nombre, municipio, sector, cats, descripcion, urgencia,
  case when tipo = 'solicitud' then contacto else null end as contacto,
  imagenes, lat, lng, estado, creado, origen
from public.publicaciones;

revoke all on public.publicaciones_publicas from anon, authenticated;
grant select on public.publicaciones_publicas to anon, authenticated;

-- Devuelve el teléfono real de cualquier publicación, pero solo si quien
-- pregunta es coordinación. Para cualquier otro devuelve nulo.
create or replace function public.contacto_privado(p_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.es_coordinador()
    then (select p.contacto from public.publicaciones p where p.id = p_id)
    else null
  end;
$$;

-- `anon` va nombrado aparte: Supabase concede EXECUTE a anon y authenticated en
-- cada función nueva mediante default privileges, y revocar sobre `public` no
-- toca esas concesiones explícitas.
revoke all on function public.contacto_privado(text) from public, anon;
grant execute on function public.contacto_privado(text) to authenticated;


-- ---------------------------------------------------------------------------
-- 5b. Almacenamiento de imágenes
--
-- Un bucket público: las fotos se ven sin autenticarse, igual que el resto del
-- tablero. El límite de 3 MB es la última barrera —el navegador ya redimensiona
-- y comprime antes de subir— y la lista de tipos evita que se suban archivos
-- que no son imágenes.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists imagenes_lectura on storage.objects;
drop policy if exists imagenes_subida  on storage.objects;
drop policy if exists imagenes_borrado on storage.objects;

create policy imagenes_lectura on storage.objects
  for select to anon, authenticated using (bucket_id = 'imagenes');

create policy imagenes_subida on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'imagenes');

-- Nadie puede borrar ni reemplazar la foto de otra persona; solo coordinación.
create policy imagenes_borrado on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes' and public.es_coordinador());


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
