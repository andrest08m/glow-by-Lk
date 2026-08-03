import { Container } from "@/components/site/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <>
      <Container as="section" className="pt-6 sm:pt-10">
        <Skeleton className="h-64 w-full rounded-[2.25rem] sm:h-80 sm:rounded-[3rem]" />
      </Container>
      <Container className="py-12 sm:py-16">
        <Skeleton className="mb-8 h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </Container>
    </>
  );
}
