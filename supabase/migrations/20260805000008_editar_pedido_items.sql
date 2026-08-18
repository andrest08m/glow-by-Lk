-- Editar los productos de un pedido (agregar/quitar/cambiar cantidades).
-- Si el pedido ya tenía el stock descontado, devuelve el stock de los items
-- actuales y descuenta el de los nuevos (atómico; si falta stock, revierte).

create or replace function public.editar_pedido_items(
  p_order_id uuid,
  p_items jsonb,
  p_admin_email text default null
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders;
  v_item  jsonb;
  v_old   public.order_items;
  v_prod  public.products;
  v_total numeric(12,2) := 0;
  v_cant  int;
  v_precio numeric(12,2);
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'PEDIDO_NO_EXISTE'; end if;

  if jsonb_array_length(p_items) = 0 then raise exception 'SIN_ITEMS'; end if;

  -- devolver stock de los items actuales si estaba descontado
  if v_order.stock_descontado then
    for v_old in select * from public.order_items where order_id = p_order_id loop
      perform public.registrar_movimiento(
        v_old.product_id, 'ENTRADA', v_old.cantidad,
        'Edición pedido #' || v_order.numero, p_admin_email, p_order_id);
    end loop;
  end if;

  delete from public.order_items where order_id = p_order_id;

  -- insertar los nuevos items (precio snapshot actual) y recalcular total
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant <= 0 then raise exception 'CANTIDAD_INVALIDA'; end if;
    select * into v_prod from public.products where id = (v_item->>'product_id')::uuid;
    if not found then raise exception 'PRODUCTO_NO_EXISTE'; end if;
    v_precio := coalesce(v_prod.precio_oferta, v_prod.precio);
    insert into public.order_items (order_id, product_id, cantidad, precio_unitario)
    values (p_order_id, v_prod.id, v_cant, v_precio);
    v_total := v_total + v_precio * v_cant;
  end loop;

  -- descontar stock de los nuevos items si el pedido estaba descontado
  if v_order.stock_descontado then
    for v_item in select * from jsonb_array_elements(p_items) loop
      perform public.registrar_movimiento(
        (v_item->>'product_id')::uuid, 'SALIDA', (v_item->>'cantidad')::int,
        'Edición pedido #' || v_order.numero, p_admin_email, p_order_id);
    end loop;
  end if;

  update public.orders set total = v_total, updated_at = now()
   where id = p_order_id returning * into v_order;
  return v_order;
end;
$$;

grant execute on function public.editar_pedido_items(uuid,jsonb,text) to service_role;
