export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productWhatsAppMessage(nombre: string) {
  return `Hola, estoy interesada/o en comprar el producto ${nombre}.`;
}
