import type { OrderStatus } from "@/lib/supabase/database.types";

/** Estados que cuentan como venta (decisión: desde CONFIRMADO en adelante, nunca cancelados). */
export const ESTADOS_VENTA: OrderStatus[] = ["CONFIRMADO", "EN_PREPARACION", "ENVIADO", "ENTREGADO"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_PREPARACION: "En preparación",
  ENVIADO: "Enviado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

/** Transiciones permitidas; el server las valida antes de cambiar estado. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EN_PREPARACION", "ENVIADO", "CANCELADO"],
  EN_PREPARACION: ["ENVIADO", "CANCELADO"],
  ENVIADO: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

/** Inicio del día en Bogotá (Colombia es UTC-5 fijo, sin horario de verano). */
export function bogotaStartOfDay(now = new Date()) {
  const OFFSET_MS = 5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() - OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + OFFSET_MS);
}

export function bogotaStartOfMonth(now = new Date()) {
  const OFFSET_MS = 5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() - OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCDate(1);
  return new Date(shifted.getTime() + OFFSET_MS);
}

/** Clave de día (YYYY-MM-DD) en horario de Bogotá, para agrupar ventas por día. */
export function bogotaDayKey(date: Date) {
  const OFFSET_MS = 5 * 60 * 60 * 1000;
  return new Date(date.getTime() - OFFSET_MS).toISOString().slice(0, 10);
}
