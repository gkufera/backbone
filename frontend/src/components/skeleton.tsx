export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      data-testid="skeleton"
      className={`mac-skeleton h-4 w-full ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="mac-window">
      <div className="mac-window-title">
        <span>&nbsp;</span>
      </div>
      <div className="mac-window-body space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-5/6" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
