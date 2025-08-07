import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Settings, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PetAgeConfig {
  petAgeUpdateEnabled: boolean;
  petAgeUpdateInterval: number;
  petAgeUpdateLastRun: string | null;
}

interface PetAgeUpdateResult {
  message: string;
  updatedPets: number;
  executionTime: string;
}

export function SuperAdminPetAgePanel() {
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState<string>("vetgroom-corp");

  // Fetch pet age configuration
  const { data: config, isLoading: configLoading } = useQuery<PetAgeConfig>({
    queryKey: ["/api/pets/age-config", selectedCompany],
    queryFn: async () => {
      const response = await fetch(`/api/pets/age-config/${selectedCompany}`);
      if (!response.ok) throw new Error("Failed to fetch pet age config");
      return response.json();
    },
  });

  // Manual pet age update mutation
  const updateAgesMutation = useMutation({
    mutationFn: async (): Promise<PetAgeUpdateResult> => {
      return await apiRequest("/api/pets/update-ages", "POST", {}) as PetAgeUpdateResult;
    },
    onSuccess: (data) => {
      toast({
        title: "Pet Ages Updated",
        description: `Successfully updated ${data.updatedPets} pets at ${new Date(data.executionTime).toLocaleString()}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pets/age-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pet ages",
        variant: "destructive",
      });
    },
  });

  const formatLastRun = (lastRun: string | null) => {
    if (!lastRun) return "Never";
    return new Date(lastRun).toLocaleString();
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  if (configLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pet Age Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading pet age configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pet Age Management System
        </CardTitle>
        <p className="text-sm text-gray-600">
          Automatically update pet ages based on birth dates. System calculates current age from birth date and updates pets daily.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Badge className={cn(getStatusColor(config?.petAgeUpdateEnabled || false))}>
              {config?.petAgeUpdateEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Update Interval</label>
            <div className="text-sm text-gray-900">
              {config?.petAgeUpdateInterval || 1440} minutes ({Math.round((config?.petAgeUpdateInterval || 1440) / 60)} hours)
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Last Run</label>
            <div className="text-sm text-gray-900">
              {formatLastRun(config?.petAgeUpdateLastRun || null)}
            </div>
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Manual Pet Age Update</h3>
              <p className="text-sm text-gray-600">
                Manually trigger pet age calculations for all active pets with birth dates.
              </p>
            </div>
            <Button
              onClick={() => updateAgesMutation.mutate()}
              disabled={updateAgesMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-trigger-pet-age-update"
            >
              {updateAgesMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Update Pet Ages
                </>
              )}
            </Button>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-900">How Pet Age Updates Work</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• System automatically calculates current age from birth date using PostgreSQL AGE() function</li>
                <li>• Only updates active pets (inactive pets are skipped)</li>
                <li>• Updates registeredAge field with calculated current age</li>
                <li>• Runs automatically based on configured interval (default: 24 hours)</li>
                <li>• Manual trigger available for immediate updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {updateAgesMutation.data && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Last Update Result</h4>
                <p className="text-sm text-green-800">
                  Updated {updateAgesMutation.data.updatedPets} pets at {new Date(updateAgesMutation.data.executionTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}