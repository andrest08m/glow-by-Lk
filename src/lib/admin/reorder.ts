import "server-only";

type OrderedItem = { id: string; orden: number };

/** Devuelve el par [actual, vecino] a intercambiar, o null si no hay a dónde mover. */
export function computeSwap(items: OrderedItem[], id: string, direction: "up" | "down") {
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) return null;
  return [items[index], items[swapWith]] as const;
}
