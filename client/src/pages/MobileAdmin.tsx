import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Power,
  TrendingUp,
  Calendar
} from "lucide-react";

interface SubscriptionStats {
  active: number;
  trial: number;
  expired: number;
  inactive: number;
  total: number;
  recentlyActivated: number; // in last 24 hours
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export default function MobileAdmin() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch subscription statistics
  const { data: subscriptionStats, isLoading: statsLoading } = useQuery<SubscriptionStats>({
    queryKey: ['/api/mobile-admin/subscription-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent critical activities
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<RecentActivity[]>({
    queryKey: ['/api/mobile-admin/recent-activities'],
    refetchInterval: 60000, // Refresh every minute
  });

  // App restart mutation
  const restartAppMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mobile-admin/restart-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to restart app');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "App Restart Initiated",
        description: "The application is restarting. Page will reload in 10 seconds.",
      });
      setTimeout(() => window.location.reload(), 10000);
    },
    onError: () => {
      toast({
        title: "Restart Failed",
        description: "Unable to restart the application",
        variant: "destructive",
      });
    },
  });

  const handleRestartApp = () => {
    if (window.confirm('Are you sure you want to restart the application?')) {
      restartAppMutation.mutate();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mobile Admin</h1>
            <p className="text-gray-400 text-sm">
              {currentTime.toLocaleString('es-MX', { 
                timeZone: 'America/Mexico_City',
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <Activity className="w-8 h-8 text-blue-400" />
        </div>
      </div>

      {/* Subscription Statistics */}
      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Subscription Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : subscriptionStats ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{subscriptionStats.active}</div>
                  <div className="text-xs text-green-300">Active</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{subscriptionStats.trial}</div>
                  <div className="text-xs text-blue-300">Trial</div>
                </div>
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{subscriptionStats.expired}</div>
                  <div className="text-xs text-red-300">Expired</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-400">{subscriptionStats.inactive}</div>
                  <div className="text-xs text-gray-300">Inactive</div>
                </div>
              </div>
              
              {subscriptionStats.recentlyActivated > 0 && (
                <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-emerald-300">New Today</span>
                    </div>
                    <Badge className="bg-emerald-700 text-emerald-100">
                      {subscriptionStats.recentlyActivated}
                    </Badge>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p>No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Controls */}
      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Power className="w-5 h-5 text-red-400" />
            Critical Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full bg-red-900/20 border-red-800 hover:bg-red-900/30 text-red-300"
              onClick={handleRestartApp}
              disabled={restartAppMutation.isPending}
              data-testid="button-restart-app"
            >
              {restartAppMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Restart Application
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 leading-tight">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString('es-MX', {
                        timeZone: 'America/Mexico_City',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">No recent activities</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}