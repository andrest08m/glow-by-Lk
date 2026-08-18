import { Hero } from "@/components/site/hero";
import { TrustBar } from "@/components/site/trust-bar";
import { ProductSection } from "@/components/site/product-section";
import { CategoryGrid } from "@/components/site/category-grid";
// el render dinámico lo fija el layout público (force-dynamic)
import {
  getFeaturedProducts,
  getNewProducts,
  getBestSellers,
  getCategoriesWithImage,
} from "@/lib/products";

export default async function HomePage() {
  const [destacados, nuevos, masVendidos, categorias] = await Promise.all([
    getFeaturedProducts(),
    getNewProducts(),
    getBestSellers(),
    getCategoriesWithImage(),
  ]);

  return (
    <>
      <Hero />
      <TrustBar />
      <ProductSection title="Destacados" products={destacados} viewAllHref="/productos" />
      <ProductSection title="Nuevos" products={nuevos} viewAllHref="/productos" />
      <ProductSection title="Más vendidos" products={masVendidos} viewAllHref="/productos" />
      <CategoryGrid categories={categorias} />
    </>
  );
}
