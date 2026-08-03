import { Container } from "@/components/site/container";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";

export default function Loading() {
  return (
    <Container className="py-8 sm:py-12">
      <Skeleton className="mb-8 h-9 w-48" />
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 space-y-3 lg:w-64">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </aside>
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </Container>
  );
}
