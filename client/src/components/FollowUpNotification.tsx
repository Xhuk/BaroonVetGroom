import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

interface FollowUpNotificationProps {
  className?: string;
}

interface FollowUpConfig {
  followUpNormalThreshold: number;
  followUpUrgentThreshold: number;
  followUpHeartBeatEnabled: boolean;
  followUpShowCount: boolean;
}

export function FollowUpNotification({ className }: FollowUpNotificationProps) {
  const { currentTenant } = useTenant();
  const [followUpCount, setFollowUpCount] = useState(0);

  // Get follow-up configuration from company settings
  const { data: followUpConfig } = useQuery<FollowUpConfig>({
    queryKey: ["/api/company/follow-up-config", currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  // Get follow-up count
  const { data: followUpData } = useQuery({
    queryKey: ["/api/medical-appointments/follow-up-count", currentTenant?.id],
    enabled: !!currentTenant?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (followUpData?.count !== undefined) {
      setFollowUpCount(followUpData.count);
    }
  }, [followUpData]);

  // Default configuration if not set
  const config = {
    followUpNormalThreshold: followUpConfig?.followUpNormalThreshold ?? 10,
    followUpUrgentThreshold: followUpConfig?.followUpUrgentThreshold ?? 20,
    followUpHeartBeatEnabled: followUpConfig?.followUpHeartBeatEnabled ?? true,
    followUpShowCount: followUpConfig?.followUpShowCount ?? true,
  };

  // Determine heart beat speed based on count and thresholds
  const getHeartBeatClass = () => {
    if (!config.followUpHeartBeatEnabled || followUpCount === 0) {
      return "";
    }

    if (followUpCount >= config.followUpUrgentThreshold) {
      return "animate-heartbeat-fast"; // Fast beat
    } else if (followUpCount >= config.followUpNormalThreshold) {
      return "animate-heartbeat-slow"; // Slow beat
    }

    return "";
  };

  // Determine heart color based on urgency
  const getHeartColor = () => {
    if (followUpCount === 0) {
      return "text-gray-400";
    } else if (followUpCount >= config.followUpUrgentThreshold) {
      return "text-red-500";
    } else if (followUpCount >= config.followUpNormalThreshold) {
      return "text-orange-500";
    }
    
    return "text-blue-500";
  };

  if (!currentTenant) {
    return null;
  }

  return (
    <div className={cn("relative inline-flex items-center", className)} data-testid="follow-up-notification">
      <Heart
        className={cn(
          "h-6 w-6 transition-colors duration-300",
          getHeartColor(),
          getHeartBeatClass()
        )}
        data-testid="heart-icon"
      />
      
      {config.followUpShowCount && followUpCount > 0 && (
        <Badge
          variant={followUpCount >= config.followUpUrgentThreshold ? "destructive" : "secondary"}
          className={cn(
            "absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs",
            followUpCount >= config.followUpUrgentThreshold ? "bg-red-500" : 
            followUpCount >= config.followUpNormalThreshold ? "bg-orange-500" : "bg-blue-500"
          )}
          data-testid="follow-up-count-badge"
        >
          {followUpCount > 99 ? "99+" : followUpCount}
        </Badge>
      )}
    </div>
  );
}