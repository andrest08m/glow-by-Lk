-- glow by Lk — schema completo (catálogo + inventario + pedidos)
-- Reemplaza el schema de Prisma. snake_case, estilo Supabase.

-- ── Catálogo ────────────────────────────────────────────────────────────────

create table public.brands (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  slug       text        not null unique,
  imagen     text,
  orden      int         not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  slug       text        not null unique,
  imagen     text,
  orden      int         not null default 0,
  created_at timestamptz not null default now()
);

create table public.subcategories (
  id          uuid        primary key default gen_random_uuid(),
  category_id uuid        not null references public.categories(id) on delete cascade,
  nombre      text        not null,
  slug        text        not null,
  orden       int         not null default 0,
  created_at  timestamptz not null default now(),
  unique (category_id, slug)
);
create index on public.subcategories (category_id);

create table public.products (
  id                uuid          primary key default gen_random_uuid(),
  nombre            text          not null,
  slug              text          not null unique,
  codigo_interno    text          unique,
  sku               text          unique,
  descripcion_corta text,
  descripcion_larga text,
  precio            numeric(12,2) not null check (precio >= 0),
  precio_oferta     numeric(12,2) check (precio_oferta >= 0),
  costo             numeric(12,2) check (costo >= 0),
  cantidad          int           not null default 0,
  stock_minimo      int           not null default 5,
  estado            text          not null default 'DISPONIBLE'
                    check (estado in ('DISPONIBLE','POCO_STOCK','AGOTADO')),
  destacado         boolean       not null default false,
  nuevo             boolean       not null default false,
  mas_vendido       boolean       not null default false,
  activo            boolean       not null default true,
  orden             int           not null default 0,
  brand_id          uuid          references public.brands(id) on delete set null,
  category_id       uuid          references public.categories(id) on delete set null,
  subcategory_id    uuid          references public.subcategories(id) on delete set null,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);
create index on public.products (activo, destacado);
create index on public.products (activo, nuevo);
create index on public.products (activo, mas_vendido);
create index on public.products (brand_id);
create index on public.products (category_id);
create index on public.products (subcategory_id);
create index on public.products (estado);

create table public.product_images (
  id         uuid        primary key default gen_random_uuid(),
  product_id uuid        not null references public.products(id) on delete cascade,
  url        text        not null,
  alt        text,
  orden      int         not null default 0
);
create index on public.product_images (product_id);

create table public.site_settings (
  clave text primary key,
  valor text not null
);

-- ── Clientes / Pedidos / Inventario ─────────────────────────────────────────

create table public.customers (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  whatsapp   text        not null unique,
  direccion  text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id               uuid          primary key default gen_random_uuid(),
  numero           bigint        generated always as identity unique,
  customer_id      uuid          references public.customers(id) on delete set null,
  cliente_nombre   text          not null,
  cliente_telefono text          not null,
  total            numeric(12,2) not null default 0,
  estado           text          not null default 'PENDIENTE'
                   check (estado in ('PENDIENTE','CONFIRMADO','EN_PREPARACION','ENVIADO','ENTREGADO','CANCELADO')),
  stock_descontado boolean       not null default false,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (estado, created_at);

create table public.order_items (
  id              uuid          primary key default gen_random_uuid(),
  order_id        uuid          not null references public.orders(id) on delete cascade,
  product_id      uuid          not null references public.products(id),
  cantidad        int           not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null
);
create index on public.order_items (order_id);
create index on public.order_items (product_id);

create table public.inventory_movements (
  id               uuid        primary key default gen_random_uuid(),
  product_id       uuid        not null references public.products(id) on delete cascade,
  tipo             text        not null check (tipo in ('ENTRADA','SALIDA','AJUSTE')),
  cantidad         int         not null, -- con signo: +entrada, -salida, ±ajuste
  saldo_resultante int         not null,
  motivo           text,
  admin_email      text,
  order_id         uuid        references public.orders(id) on delete set null,
  fecha            timestamptz not null default now()
);
create index on public.inventory_movements (product_id, fecha);
create index on public.inventory_movements (order_id);

-- ── GRANTs (auto_expose_new_tables = false en Supabase cloud) ────────────────
-- El RLS (migración siguiente) controla qué filas ve cada rol. El admin escribe
-- vía cliente service-role (bypassa RLS), así que aquí solo habilitamos lo
-- necesario para la lectura pública del catálogo con la anon key.

grant usage on schema public to anon, authenticated;

grant select on public.brands        to anon, authenticated;
grant select on public.categories    to anon, authenticated;
grant select on public.subcategories to anon, authenticated;
grant select on public.products      to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
