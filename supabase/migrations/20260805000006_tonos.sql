-- Tonos (variantes con imagen) de un producto. Ej: tonos de un corrector.
-- Un producto "tiene tonos" si posee filas aquí; el público ve un selector.

create table public.product_tonos (
  id         uuid        primary key default gen_random_uuid(),
  product_id uuid        not null references public.products(id) on delete cascade,
  nombre     text        not null,
  imagen     text,
  orden      int         not null default 0,
  created_at timestamptz not null default now()
);
create index on public.product_tonos (product_id);

grant select on public.product_tonos to anon, authenticated;

alter table public.product_tonos enable row level security;

create policy "product_tonos_public_read" on public.product_tonos
  for select using (true);
