import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="animate-pulse bg-card rounded-xl p-4 border">
      <Skeleton className="h-4 w-3/4 mb-3" />
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 mb-2 ${i === linhas - 1 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
