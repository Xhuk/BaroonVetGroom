interface SimulatedConnection {
  tenantId: string;
  userId: string;
  connectionTime: number;
  lastActivity: number;
}

interface LoadTestMetrics {
  totalConnections: number;
  totalTenants: number;
  memoryUsageMB: number;
  avgConnectionsPerTenant: number;
  peakConnectionsPerTenant: number;
  connectionEstablishmentRate: number;
  estimatedPollingLoad: number;
  actualWebSocketLoad: number;
  performanceGain: number;
}

class LoadTestSimulator {
  private simulatedConnections: Map<string, SimulatedConnection[]> = new Map();
  private readonly MEMORY_PER_CONNECTION_KB = 8; // Estimated memory per WebSocket connection
  private readonly API_POLLING_INTERVAL = 60; // seconds
  private readonly BATCH_UPDATE_INTERVAL = 2; // seconds

  // Simulate realistic tenant distribution
  generateRealisticTenantDistribution(totalUsers: number, totalTenants: number): Map<string, number> {
    const distribution = new Map<string, number>();
    
    // Generate tenant IDs
    const tenantIds = Array.from({ length: totalTenants }, (_, i) => `tenant-${String(i + 1).padStart(4, '0')}`);
    
    // Use Pareto distribution (80/20 rule) - some tenants have many users, most have few
    const largeTenants = Math.floor(totalTenants * 0.2); // 20% of tenants
    const largeTenantsUsers = Math.floor(totalUsers * 0.6); // Get 60% of users
    const remainingUsers = totalUsers - largeTenantsUsers;
    
    // Distribute users among large tenants
    for (let i = 0; i < largeTenants; i++) {
      const baseUsers = Math.floor(largeTenantsUsers / largeTenants);
      const variance = Math.floor(Math.random() * (baseUsers * 0.5)); // Add some randomness
      distribution.set(tenantIds[i], baseUsers + variance);
    }
    
    // Distribute remaining users among small tenants
    const smallTenants = totalTenants - largeTenants;
    for (let i = largeTenants; i < totalTenants; i++) {
      const users = Math.max(1, Math.floor(Math.random() * 5) + 1); // 1-5 users per small tenant
      distribution.set(tenantIds[i], Math.min(users, remainingUsers - (totalTenants - i - 1)));
    }
    
    return distribution;
  }

  simulateLoad(totalUsers: number, totalTenants: number): LoadTestMetrics {
    console.log(`Simulating load: ${totalUsers} users across ${totalTenants} tenants`);
    
    // Clear previous simulation
    this.simulatedConnections.clear();
    
    // Generate realistic distribution
    const distribution = this.generateRealisticTenantDistribution(totalUsers, totalTenants);
    
    let actualUsers = 0;
    let peakConnections = 0;
    const connectionCounts: number[] = [];
    
    // Simulate connections
    for (const [tenantId, userCount] of distribution.entries()) {
      if (actualUsers + userCount > totalUsers) break;
      
      const connections: SimulatedConnection[] = [];
      const now = Date.now();
      
      for (let i = 0; i < userCount; i++) {
        connections.push({
          tenantId,
          userId: `user-${tenantId}-${i + 1}`,
          connectionTime: now - Math.random() * 3600000, // Random connection time in last hour
          lastActivity: now - Math.random() * 300000 // Random activity in last 5 minutes
        });
      }
      
      this.simulatedConnections.set(tenantId, connections);
      actualUsers += userCount;
      connectionCounts.push(userCount);
      peakConnections = Math.max(peakConnections, userCount);
    }
    
    // Calculate metrics
    const avgConnectionsPerTenant = actualUsers / this.simulatedConnections.size;
    const memoryUsageMB = (actualUsers * this.MEMORY_PER_CONNECTION_KB) / 1024;
    
    // Calculate polling vs WebSocket load
    const pollingRequestsPerMinute = actualUsers * (60 / this.API_POLLING_INTERVAL);
    const webSocketMessagesPerMinute = this.simulatedConnections.size * (60 / this.BATCH_UPDATE_INTERVAL);
    const performanceGain = ((pollingRequestsPerMinute - webSocketMessagesPerMinute) / pollingRequestsPerMinute) * 100;
    
    const metrics: LoadTestMetrics = {
      totalConnections: actualUsers,
      totalTenants: this.simulatedConnections.size,
      memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
      avgConnectionsPerTenant: Math.round(avgConnectionsPerTenant * 100) / 100,
      peakConnectionsPerTenant: peakConnections,
      connectionEstablishmentRate: actualUsers / 10, // Assume 10 seconds to establish all connections
      estimatedPollingLoad: pollingRequestsPerMinute,
      actualWebSocketLoad: webSocketMessagesPerMinute,
      performanceGain: Math.round(performanceGain * 100) / 100
    };
    
    return metrics;
  }

  getDetailedTenantStats(): { tenantId: string; connections: number; avgMemoryKB: number }[] {
    const stats: { tenantId: string; connections: number; avgMemoryKB: number }[] = [];
    
    for (const [tenantId, connections] of this.simulatedConnections.entries()) {
      stats.push({
        tenantId,
        connections: connections.length,
        avgMemoryKB: connections.length * this.MEMORY_PER_CONNECTION_KB
      });
    }
    
    return stats.sort((a, b) => b.connections - a.connections);
  }

  estimateServerCapacity(): {
    maxConnections: number;
    maxTenants: number;
    memoryLimit: string;
    cpuCores: number;
  } {
    // Conservative estimates for a typical cloud server
    const availableMemoryGB = 4; // 4GB available for connections
    const maxConnectionsByMemory = (availableMemoryGB * 1024 * 1024) / this.MEMORY_PER_CONNECTION_KB;
    
    return {
      maxConnections: Math.floor(maxConnectionsByMemory),
      maxTenants: Math.floor(maxConnectionsByMemory / 2), // Assume average 2 connections per tenant
      memoryLimit: `${availableMemoryGB}GB`,
      cpuCores: 2 // Typical cloud instance
    };
  }
}

export const loadTestSimulator = new LoadTestSimulator();