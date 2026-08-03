export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFecha(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

export function formatFechaCorta(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(date);
}
