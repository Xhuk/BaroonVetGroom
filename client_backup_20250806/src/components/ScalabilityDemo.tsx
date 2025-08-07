import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WebSocketStats {
  totalConnections: number;
  totalTenants: number;
  tenantStats: Record<string, number>;
  scalabilityNote: string;
  performanceGain: string;
}

export function ScalabilityDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);

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

  const loadTestMutation = useMutation({
    mutationFn: async (params: { totalUsers: number; totalTenants: number }) => {
      return apiRequest('/api/admin/simulate-load', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },
    onSuccess: (data) => {
      setSimulationResults(data);
    }
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
            <div className="flex gap-2">
              <Button 
                onClick={() => loadTestMutation.mutate({ totalUsers: 4000, totalTenants: 3000 })}
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-600 hover:bg-blue-100"
                disabled={loadTestMutation.isPending}
              >
                {loadTestMutation.isPending ? 'Testing...' : 'Test 4K Users'}
              </Button>
              <Button 
                onClick={() => setShowDemo(true)}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-600 hover:bg-green-100"
              >
                View Stats
              </Button>
            </div>
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

            {/* Load Test Results */}
            {simulationResults && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
                <h4 className="font-medium text-blue-800 mb-3">Load Test Results: {simulationResults.simulation.requested.totalUsers} Users / {simulationResults.simulation.requested.totalTenants} Tenants</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <div className="text-lg font-bold text-blue-700">{simulationResults.simulation.metrics.totalConnections}</div>
                    <div className="text-xs text-blue-600">Simulated Connections</div>
                  </div>
                  <div className="bg-white rounded p-3 border border-blue-200">
                    <div className="text-lg font-bold text-blue-700">{simulationResults.simulation.metrics.memoryUsageMB}MB</div>
                    <div className="text-xs text-blue-600">Memory Usage</div>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-200 mb-3">
                  <div className="text-sm font-medium text-blue-800 mb-2">Performance Comparison</div>
                  <div className="text-xs text-blue-600 mb-1">
                    API Polling: {simulationResults.simulation.metrics.estimatedPollingLoad.toLocaleString()} requests/minute
                  </div>
                  <div className="text-xs text-blue-600 mb-1">
                    WebSocket: {simulationResults.simulation.metrics.actualWebSocketLoad.toLocaleString()} messages/minute
                  </div>
                  <div className="text-sm font-bold text-blue-700">
                    {simulationResults.simulation.metrics.performanceGain}% reduction in server load
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-2">System Capacity</div>
                  <div className={`text-xs font-medium ${simulationResults.simulation.scalabilityAnalysis.canHandle ? 'text-green-600' : 'text-red-600'}`}>
                    {simulationResults.simulation.scalabilityAnalysis.canHandle ? '✅ System can handle this load' : '❌ Exceeds current capacity'}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Max Capacity: {simulationResults.simulation.serverCapacity.maxConnections.toLocaleString()} connections
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}