import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Plus,
  Settings,
  BarChart3,
  DollarSign
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExternalServiceSubscription {
  id: string;
  companyId: string;
  serviceName: string;
  serviceType: string;
  subscriptionStatus: string;
  creditsRemaining: number;
  creditsTotal: number;
  pricePerBlock: number;
  blockSize: number;
  autoRefill: boolean;
  lowCreditThreshold: number;
  lastRefillDate?: string;
  nextBillingDate?: string;
  usageThisPeriod: number;
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface WhatsAppUsageStats {
  totalMessagesThisMonth: number;
  outboundMessages: number;
  inboundMessages: number;
  averageCostPerMessage: number;
  totalCostThisMonth: number;
  businessHoursUsage: number;
  afterHoursUsage: number;
}

export default function AdminExternalServices() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseBlocks, setPurchaseBlocks] = useState(1);

  // Fetch company's external service subscriptions
  const { data: subscriptions, isLoading } = useQuery<ExternalServiceSubscription[]>({
    queryKey: ['/api/external-services', currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  // Fetch WhatsApp usage statistics
  const { data: whatsappUsage } = useQuery<WhatsAppUsageStats>({
    queryKey: ['/api/external-services', currentTenant?.companyId, 'whatsapp-usage'],
    enabled: !!currentTenant?.companyId,
  });

  // Fetch external service status
  const { data: serviceStatus } = useQuery<any>({
    queryKey: ['/api/external-services/status', currentTenant?.companyId],
    enabled: !!currentTenant?.companyId,
  });

  // WhatsApp subscription (find or create)
  const whatsappSubscription = subscriptions?.find(sub => sub.serviceName === 'whatsapp') || {
    id: '',
    companyId: currentTenant?.companyId || '',
    serviceName: 'whatsapp',
    serviceType: 'communication',
    subscriptionStatus: 'inactive',
    creditsRemaining: 0,
    creditsTotal: 0,
    pricePerBlock: 29.99,
    blockSize: 1000,
    autoRefill: false,
    lowCreditThreshold: 100,
    usageThisPeriod: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ExternalServiceSubscription;

  // Enable/Disable WhatsApp service
  const toggleWhatsAppMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest(`/api/external-services/${currentTenant?.companyId}/subscription`, {
        method: 'POST',
        body: JSON.stringify({ 
          serviceName: 'whatsapp',
          serviceType: 'communication',
          creditsTotal: enabled ? 1000 : 0,
          subscriptionStatus: enabled ? 'active' : 'inactive'
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/external-services'] });
      toast({
        title: "WhatsApp service updated",
        description: "Service status has been updated successfully.",
      });
    },
  });

  // Purchase message credits
  const purchaseCreditsMutation = useMutation({
    mutationFn: async (blocks: number) => {
      const creditsToAdd = blocks * whatsappSubscription.blockSize;
      return apiRequest(`/api/external-services/${whatsappSubscription.id}/credits`, {
        method: 'PUT',
        body: JSON.stringify({ 
          creditsToAdd,
          blocksPurchased: blocks
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/external-services'] });
      setShowPurchaseDialog(false);
      setPurchaseBlocks(1);
      toast({
        title: "Credits purchased successfully",
        description: `Added ${purchaseBlocks * whatsappSubscription.blockSize} WhatsApp message credits.`,
      });
    },
  });

  const creditUsagePercentage = whatsappSubscription.creditsTotal > 0 
    ? ((whatsappSubscription.creditsTotal - whatsappSubscription.creditsRemaining) / whatsappSubscription.creditsTotal) * 100 
    : 0;

  const isLowCredits = whatsappSubscription.creditsRemaining <= whatsappSubscription.lowCreditThreshold;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header>
          <div className="flex items-center space-x-4">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900">External Services</h1>
          </div>
        </Header>
        <div className="p-6">
          <div className="text-center py-8">Loading external services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">External Services</h1>
            <p className="text-sm text-gray-600">Manage communication services and subscriptions</p>
          </div>
        </div>
      </Header>

      <div className="p-6 space-y-6">
        <Tabs defaultValue="whatsapp" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp">WhatsApp Communication</TabsTrigger>
            <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="whatsapp" className="space-y-6">
            {/* Service Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                    <div>
                      <CardTitle>WhatsApp Communication Service</CardTitle>
                      <p className="text-sm text-gray-600">Automated messaging for appointments, reminders, and notifications</p>
                    </div>
                  </div>
                  <Badge variant={whatsappSubscription.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                    {whatsappSubscription.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="whatsapp-enabled">Enable WhatsApp Service</Label>
                    <p className="text-sm text-gray-500">Allow automated WhatsApp messaging for your clinic</p>
                  </div>
                  <Switch
                    id="whatsapp-enabled"
                    checked={whatsappSubscription.subscriptionStatus === 'active'}
                    onCheckedChange={(checked) => toggleWhatsAppMutation.mutate(checked)}
                    disabled={toggleWhatsAppMutation.isPending}
                  />
                </div>

                {whatsappSubscription.subscriptionStatus === 'active' && (
                  <>
                    {/* Credits Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className={isLowCredits ? "border-red-200 bg-red-50" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Credits Remaining</p>
                              <p className={`text-2xl font-bold ${isLowCredits ? 'text-red-600' : 'text-green-600'}`}>
                                {whatsappSubscription.creditsRemaining.toLocaleString()}
                              </p>
                            </div>
                            {isLowCredits ? (
                              <AlertTriangle className="h-8 w-8 text-red-500" />
                            ) : (
                              <CheckCircle className="h-8 w-8 text-green-500" />
                            )}
                          </div>
                          {isLowCredits && (
                            <p className="text-sm text-red-600 mt-2">Low credits warning!</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Used This Period</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {whatsappSubscription.usageThisPeriod.toLocaleString()}
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Cost Per Block</p>
                              <p className="text-2xl font-bold text-purple-600">
                                ${whatsappSubscription.pricePerBlock}
                              </p>
                              <p className="text-xs text-gray-500">per 1,000 messages</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-purple-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Usage Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Credit Usage</Label>
                        <span className="text-sm text-gray-600">
                          {(whatsappSubscription.creditsTotal - whatsappSubscription.creditsRemaining).toLocaleString()} / {whatsappSubscription.creditsTotal.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={creditUsagePercentage} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {creditUsagePercentage.toFixed(1)}% used
                      </p>
                    </div>

                    {/* Purchase Credits */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">Need more message credits?</h4>
                        <p className="text-sm text-gray-600">Purchase additional message blocks to continue service</p>
                      </div>
                      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
                        <DialogTrigger asChild>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Purchase Credits
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Purchase WhatsApp Message Credits</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="blocks">Number of Blocks (1,000 messages each)</Label>
                              <Input
                                id="blocks"
                                type="number"
                                min="1"
                                max="50"
                                value={purchaseBlocks}
                                onChange={(e) => setPurchaseBlocks(parseInt(e.target.value) || 1)}
                                className="mt-1"
                              />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span>Messages:</span>
                                <span className="font-medium">{(purchaseBlocks * whatsappSubscription.blockSize).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center mb-2">
                                <span>Price per block:</span>
                                <span className="font-medium">${whatsappSubscription.pricePerBlock}</span>
                              </div>
                              <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total Cost:</span>
                                <span>${(purchaseBlocks * whatsappSubscription.pricePerBlock).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => setShowPurchaseDialog(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => purchaseCreditsMutation.mutate(purchaseBlocks)}
                                disabled={purchaseCreditsMutation.isPending}
                                className="flex-1"
                              >
                                {purchaseCreditsMutation.isPending ? 'Processing...' : 'Purchase'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>WhatsApp Usage Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {whatsappUsage ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {whatsappUsage.totalMessagesThisMonth?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Messages This Month</div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {whatsappUsage.outboundMessages?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Outbound Messages</div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        ${whatsappUsage.totalCostThisMonth?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-gray-600">Total Cost This Month</div>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {whatsappUsage.businessHoursUsage?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">Business Hours Usage</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No usage data available for this period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Service Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">WhatsApp Service</div>
                        <div className="text-sm text-gray-600">Automated messaging and notifications</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {serviceStatus?.whatsapp?.enabled ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <Badge variant="default">Active</Badge>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <Badge variant="secondary">Inactive</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {serviceStatus?.whatsapp?.lowCreditAlert && (
                    <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <div className="font-semibold text-red-800">Low Credit Alert</div>
                        <div className="text-sm text-red-600">
                          Only {serviceStatus.whatsapp.creditsRemaining} credits remaining. Consider purchasing more credits.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}