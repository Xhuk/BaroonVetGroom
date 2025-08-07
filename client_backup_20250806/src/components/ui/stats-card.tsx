import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
  availability?: {
    available: number;
    total: number;
    status: "available" | "full" | "limited";
  };
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  className,
  availability 
}: StatsCardProps) {
  const getAvailabilityIndicator = () => {
    if (!availability) return null;
    
    const statusColors = {
      available: "bg-green-300",
      limited: "bg-yellow-300", 
      full: "bg-red-400"
    };
    
    return (
      <div className="flex items-center text-xs mt-2">
        <div className={cn("w-2 h-2 rounded-full mr-1", statusColors[availability.status])}></div>
        <span>
          {availability.status === "available" && `${availability.available}/${availability.total} disponibles`}
          {availability.status === "limited" && `${availability.available}/${availability.total} disponibles`}
          {availability.status === "full" && `${availability.available}/${availability.total} disponibles`}
        </span>
      </div>
    );
  };

  return (
    <Card className={cn(
      "rounded-lg p-4 text-white relative overflow-hidden",
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-90">{title}</div>
        </div>
        <div className="text-xl opacity-70">
          {icon}
        </div>
      </div>
      {availability && getAvailabilityIndicator()}
      {subtitle && !availability && (
        <div className="text-xs mt-2">
          <span>{subtitle}</span>
        </div>
      )}
    </Card>
  );
}
