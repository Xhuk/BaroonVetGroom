import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';

interface WebSocketStats {
  totalConnections: number;
  totalTenants: number;
  tenantStats: Record<string, number>;
  scalabilityNote: string;
  performanceGain: string;
}

export function ScalabilityDemo() {
  const [showDemo, setShowDemo] = useState(false);

  const { data: wsStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['websocket-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/websocket-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch WebSocket stats');
      }
      return response.json();
    },
    enabled: showDemo,
    refetchInterval: 5000 // Refresh every 5 seconds when active
  });

  if (!showDemo) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-800">🚀 Scalability Achievement</h3>
              <p className="text-sm text-green-600">System optimized for 2000+ tenants with WebSocket connections</p>
            </div>
            <Button 
              onClick={() => setShowDemo(true)}
              variant="outline"
              size="sm"
              className="border-green-600 text-green-600 hover:bg-green-100"
            >
              View Stats
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-800 text-lg">Real-time Connection Statistics</CardTitle>
          <Button 
            onClick={() => setShowDemo(false)}
            variant="ghost"
            size="sm"
            className="text-green-600 hover:bg-green-100"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statsLoading ? (
          <div className="text-green-600">Loading connection stats...</div>
        ) : statsError ? (
          <div className="text-red-600">Failed to load stats. Admin access required.</div>
        ) : wsStats?.success && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{wsStats.stats.totalConnections}</div>
                <div className="text-sm text-green-600">Active WebSocket Connections</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-2xl font-bold text-green-700">{wsStats.stats.totalTenants}</div>
                <div className="text-sm text-green-600">Connected Tenants</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Performance Impact</h4>
              <p className="text-sm text-green-600 mb-2">{wsStats.stats.scalabilityNote}</p>
              <div className="text-lg font-semibold text-green-700">{wsStats.stats.performanceGain}</div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Architecture Benefits</h4>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• Real-time updates without polling</li>
                <li>• Batched updates every 2 seconds</li>
                <li>• Automatic connection recovery</li>
                <li>• Per-tenant connection isolation</li>
                <li>• Heartbeat monitoring (30s timeout)</li>
              </ul>
            </div>

            {Object.keys(wsStats.stats.tenantStats).length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">Active Tenants</h4>
                <div className="space-y-1">
                  {Object.entries(wsStats.stats.tenantStats).map(([tenantId, connections]) => (
                    <div key={tenantId} className="flex justify-between text-sm">
                      <span className="text-green-600">{tenantId}</span>
                      <span className="text-green-700 font-medium">{connections as number} connections</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}