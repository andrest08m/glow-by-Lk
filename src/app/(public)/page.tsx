import { Hero } from "@/components/site/hero";
import { ProductSection } from "@/components/site/product-section";
import { CategoryGrid } from "@/components/site/category-grid";
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
      <ProductSection title="Destacados" products={destacados} viewAllHref="/productos" />
      <ProductSection title="Nuevos" products={nuevos} viewAllHref="/productos" />
      <ProductSection title="Más vendidos" products={masVendidos} viewAllHref="/productos" />
      <CategoryGrid categories={categorias} />
    </>
  );
}
