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
      <div className="mac-window-body space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
