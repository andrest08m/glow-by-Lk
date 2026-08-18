// Tipos de la base de datos glow by Lk (escritos a mano; se pueden regenerar con
// `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`).

export type ProductStatus = "DISPONIBLE" | "POCO_STOCK" | "AGOTADO";
export type OrderStatus =
  | "PENDIENTE"
  | "CONFIRMADO"
  | "EN_PREPARACION"
  | "ENVIADO"
  | "ENTREGADO"
  | "CANCELADO";
export type MovementType = "ENTRADA" | "SALIDA" | "AJUSTE";

type Timestamps = { created_at: string };

export type BrandRow = {
  id: string;
  nombre: string;
  slug: string;
  imagen: string | null;
  orden: number;
} & Timestamps;

export type CategoryRow = {
  id: string;
  nombre: string;
  slug: string;
  imagen: string | null;
  orden: number;
} & Timestamps;

export type SubcategoryRow = {
  id: string;
  category_id: string;
  nombre: string;
  slug: string;
  orden: number;
} & Timestamps;

export type ProductRow = {
  id: string;
  nombre: string;
  slug: string;
  codigo_interno: string | null;
  sku: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  precio: number;
  precio_oferta: number | null;
  costo: number | null;
  cantidad: number;
  stock_minimo: number;
  estado: ProductStatus;
  destacado: boolean;
  nuevo: boolean;
  mas_vendido: boolean;
  activo: boolean;
  orden: number;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImageRow = {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  orden: number;
};

export type ProductTonoRow = {
  id: string;
  product_id: string;
  nombre: string;
  imagen: string | null;
  orden: number;
  created_at: string;
};

export type SiteSettingRow = { clave: string; valor: string };

export type CustomerRow = {
  id: string;
  nombre: string;
  whatsapp: string;
  direccion: string | null;
} & Timestamps;

export type OrderRow = {
  id: string;
  numero: number;
  customer_id: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  total: number;
  estado: OrderStatus;
  stock_descontado: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  cantidad: number;
  precio_unitario: number;
};

export type InventoryMovementRow = {
  id: string;
  product_id: string;
  tipo: MovementType;
  cantidad: number;
  saldo_resultante: number;
  motivo: string | null;
  admin_email: string | null;
  order_id: string | null;
  fecha: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      brands: Table<BrandRow, Partial<BrandRow> & { nombre: string; slug: string }>;
      categories: Table<CategoryRow, Partial<CategoryRow> & { nombre: string; slug: string }>;
      subcategories: Table<
        SubcategoryRow,
        Partial<SubcategoryRow> & { category_id: string; nombre: string; slug: string }
      >;
      products: Table<ProductRow, Partial<ProductRow> & { nombre: string; slug: string; precio: number }>;
      product_images: Table<
        ProductImageRow,
        Partial<ProductImageRow> & { product_id: string; url: string }
      >;
      product_tonos: Table<
        ProductTonoRow,
        Partial<ProductTonoRow> & { product_id: string; nombre: string }
      >;
      site_settings: Table<SiteSettingRow, SiteSettingRow>;
      customers: Table<CustomerRow, Partial<CustomerRow> & { nombre: string; whatsapp: string }>;
      orders: Table<OrderRow, Partial<OrderRow> & { cliente_nombre: string; cliente_telefono: string }>;
      order_items: Table<
        OrderItemRow,
        Partial<OrderItemRow> & { order_id: string; product_id: string; cantidad: number; precio_unitario: number }
      >;
      inventory_movements: Table<InventoryMovementRow>;
    };
    Views: Record<string, never>;
    Functions: {
      registrar_movimiento: {
        Args: {
          p_product_id: string;
          p_tipo: MovementType;
          p_cantidad: number;
          p_motivo?: string | null;
          p_admin_email?: string | null;
          p_order_id?: string | null;
        };
        Returns: InventoryMovementRow;
      };
      crear_pedido: {
        Args: {
          p_customer_id: string | null;
          p_nuevo_cliente: Record<string, unknown> | null;
          p_items: { product_id: string; cantidad: number }[];
        };
        Returns: OrderRow;
      };
      cambiar_estado_pedido: {
        Args: { p_order_id: string; p_nuevo_estado: OrderStatus; p_admin_email?: string | null };
        Returns: OrderRow;
      };
      eliminar_pedido: {
        Args: { p_order_id: string; p_admin_email?: string | null };
        Returns: undefined;
      };
      ventas_por_dia: { Args: { p_dias?: number }; Returns: { fecha: string; total: number }[] };
      top_productos: {
        Args: { p_limite?: number };
        Returns: { product_id: string; nombre: string; unidades: number }[];
      };
      dashboard_metricas: { Args: Record<string, never>; Returns: Record<string, number> };
      movimientos_resumen: { Args: Record<string, never>; Returns: Record<string, number> };
    };
    Enums: Record<string, never>;
  };
};
