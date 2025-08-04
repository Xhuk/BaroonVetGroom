import { cn } from "@/lib/utils";

interface FastLoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function FastLoadingSpinner({ size = "md", className, text }: FastLoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-gray-200 border-t-blue-500",
        sizeClasses[size]
      )} />
      {text && (
        <p className="mt-3 text-sm text-gray-600 font-medium">{text}</p>
      )}
    </div>
  );
}

export function FastPageLoader({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <FastLoadingSpinner size="lg" text={text} />
    </div>
  );
}