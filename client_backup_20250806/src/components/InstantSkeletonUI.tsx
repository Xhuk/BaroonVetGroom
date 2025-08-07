import { Card, CardContent } from "@/components/ui/card";

/**
 * Ultra-fast skeleton UI that renders instantly (0ms)
 * Shows immediately while data loads in background
 */
export function InstantAppointmentsSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="border-l-4 border-l-gray-300">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Generic instant skeleton for any page
 */
export function InstantPageSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}