/** Normaliza un teléfono a formato internacional para wa.me. Colombia por
 *  defecto: si son 10 dígitos (celular local), antepone el indicativo 57. */
export function normalizeWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string) {
  return `https://wa.me/${normalizeWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(nombre: string) {
  return `Hola, estoy interesada/o en comprar el producto ${nombre}.`;
}
