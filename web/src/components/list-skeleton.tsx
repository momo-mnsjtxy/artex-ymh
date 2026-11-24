import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="col-span-full space-y-2 p-4">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
