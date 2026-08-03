import type { Metadata } from "next";
import { ImportProducts } from "@/components/admin/products/import-products";

export const metadata: Metadata = { title: "Importar productos" };

export default function ImportProductsPage() {
  return <ImportProducts />;
}
