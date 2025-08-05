import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
  fallback?: ReactNode;
}

export function PageLoader({ children, isLoading = false, className, fallback }: PageLoaderProps) {
  if (isLoading) {
    return (
      <div className={cn("min-h-screen bg-white dark:bg-slate-900", className)}>
        {fallback || (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Cargando...</p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface FastLoaderProps {
  children: ReactNode;
  isDataLoading?: boolean;
  showSkeleton?: boolean;
}

export function FastLoader({ children, isDataLoading = false, showSkeleton = true }: FastLoaderProps) {
  // Always show the layout immediately, overlay loading state
  return (
    <div className="relative">
      {children}
      {isDataLoading && showSkeleton && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Actualizando...</span>
          </div>
        </div>
      )}
    </div>
  );
}