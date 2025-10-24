import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const KPICardSkeleton = () => (
  <Card className="bg-card border-border animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <Skeleton className="h-3 w-24" />
      </div>
    </CardContent>
  </Card>
);

export const TableSkeleton = () => (
  <Card className="bg-card/50 backdrop-blur-sm border-border">
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <Card className="bg-card/50 backdrop-blur-sm border-border">
    <CardHeader>
      <Skeleton className="h-7 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[350px] w-full rounded-lg" />
    </CardContent>
  </Card>
);
