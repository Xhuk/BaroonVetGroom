import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  CreditCard,
  DollarSign,
  ArrowLeft,
  Plus,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from "lucide-react";

export default function BillingManagement() {
  const { toast } = useToast();
  const [selectedAmount, setSelectedAmount] = useState("25");
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock billing data - in real app this would come from API
  const billingData = {
    currentBalance: 73.45,
    monthlyBudget: 100,
    usedThisMonth: 35.80,
    usagePercentage: 35.8,
    nextBillingDate: "2025-09-01",
    paymentMethod: {
      type: "visa",
      last4: "4242",
      expires: "12/26"
    }
  };

  const recentTransactions = [
    { id: 1, date: "2025-08-06", description: "Deployment compute units", amount: -8.50, type: "usage" },
    { id: 2, date: "2025-08-05", description: "Database operations", amount: -3.20, type: "usage" },
    { id: 3, date: "2025-08-04", description: "Credit top-up", amount: +25.00, type: "credit" },
    { id: 4, date: "2025-08-03", description: "API requests", amount: -2.10, type: "usage" },
    { id: 5, date: "2025-08-02", description: "Storage fees", amount: -1.80, type: "usage" }
  ];

  const usageBreakdown = [
    { service: "Deployments", amount: 18.50, percentage: 51.7 },
    { service: "Database", amount: 9.80, percentage: 27.4 },
    { service: "Storage", amount: 4.60, percentage: 12.9 },
    { service: "API Calls", amount: 2.90, percentage: 8.1 }
  ];

  const presetAmounts = ["10", "25", "50", "100", "200"];

  const handleAddCredits = async () => {
    setIsProcessing(true);
    
    const amount = selectedAmount === "custom" ? customAmount : selectedAmount;
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid credit amount",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Credits Added Successfully",
      description: `$${amount} has been added to your account`,
    });
    
    setIsProcessing(false);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 75) return "text-red-500";
    if (percentage >= 50) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-red-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/superadmin">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Back to SuperAdmin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Billing & Credits</h1>
              <p className="text-gray-400">Manage your account balance and usage</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Current Balance & Usage */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Balance Overview */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-400">${billingData.currentBalance}</span>
                  <span className="text-gray-400">available credits</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Monthly Budget: ${billingData.monthlyBudget}</span>
                    <span className={getStatusColor(billingData.usagePercentage)}>
                      Used: ${billingData.usedThisMonth} ({billingData.usagePercentage}%)
                    </span>
                  </div>
                  <Progress 
                    value={billingData.usagePercentage} 
                    className="h-2"
                    data-testid="progress-usage"
                  />
                </div>

                {billingData.usagePercentage >= 75 && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-300">
                      Warning: You've used {billingData.usagePercentage}% of your monthly budget
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Breakdown */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  Usage Breakdown
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Current month service usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-300">{item.service}</span>
                          <span className="text-sm text-gray-400">${item.amount}</span>
                        </div>
                        <Progress value={item.percentage} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5 text-purple-400" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.type === "credit" ? "bg-green-500" : "bg-red-500"
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-300">{transaction.description}</p>
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        transaction.amount > 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Credits Panel */}
          <div className="space-y-6">
            
            {/* Add Credits */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Plus className="h-5 w-5 text-green-500" />
                  Add Credits
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Top up your account balance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300">Select Amount</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {presetAmounts.map((amount) => (
                      <Button
                        key={amount}
                        variant={selectedAmount === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedAmount(amount)}
                        className="h-10"
                        data-testid={`button-amount-${amount}`}
                      >
                        ${amount}
                      </Button>
                    ))}
                    <Button
                      variant={selectedAmount === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedAmount("custom")}
                      className="col-span-2 h-10"
                      data-testid="button-amount-custom"
                    >
                      Custom Amount
                    </Button>
                  </div>
                </div>

                {selectedAmount === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="custom-amount" className="text-sm font-medium text-gray-300">
                      Enter Amount
                    </Label>
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="0.00"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      data-testid="input-custom-amount"
                    />
                  </div>
                )}

                <Separator className="bg-gray-600" />

                <Button
                  onClick={handleAddCredits}
                  disabled={isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-add-credits"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Add Credits
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="h-5 w-5 text-blue-400" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-white">VISA</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        •••• •••• •••• {billingData.paymentMethod.last4}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expires {billingData.paymentMethod.expires}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                
                <Button variant="outline" size="sm" className="w-full" data-testid="button-update-payment">
                  Update Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Billing Info */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-yellow-400" />
                  Billing Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Next billing date:</span>
                  <span className="text-sm font-medium text-gray-300">
                    {billingData.nextBillingDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Plan:</span>
                  <Badge variant="secondary" className="bg-blue-900 text-blue-300">
                    Core Plan
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Monthly credits:</span>
                  <span className="text-sm font-medium text-green-400">$25.00</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}