-- RLS para glow by Lk (un solo admin + catálogo público).
-- Catálogo: lectura pública con la anon key. Escrituras y datos sensibles:
-- solo el cliente service-role del servidor (bypassa RLS por diseño).

alter table public.brands              enable row level security;
alter table public.categories          enable row level security;
alter table public.subcategories       enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.site_settings       enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.inventory_movements enable row level security;

-- ── Lectura pública del catálogo ────────────────────────────────────────────

create policy "brands_public_read" on public.brands
  for select using (true);

create policy "categories_public_read" on public.categories
  for select using (true);

create policy "subcategories_public_read" on public.subcategories
  for select using (true);

-- El público solo ve productos activos; el admin (service-role) ve todos.
create policy "products_public_read" on public.products
  for select using (activo = true);

create policy "product_images_public_read" on public.product_images
  for select using (true);

create policy "site_settings_public_read" on public.site_settings
  for select using (true);

-- Tablas sensibles (customers, orders, order_items, inventory_movements):
-- sin políticas para anon/authenticated => nadie con la anon key las lee ni
-- escribe. El admin opera con la service-role key, que bypassa RLS.
