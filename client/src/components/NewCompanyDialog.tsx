import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Building2, 
  Calendar, 
  CreditCard, 
  Gift, 
  Users, 
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Clock
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const newCompanySchema = z.object({
  // Company Basic Info
  name: z.string().min(2, "Company name must be at least 2 characters"),
  domain: z.string().min(2, "Domain must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone must be at least 10 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  country: z.string().min(2, "Country is required"),
  taxId: z.string().optional(),
  
  // Subscription Details
  subscriptionType: z.enum(["trial", "direct_subscription"]),
  planId: z.string().optional(),
  
  // Trial Settings (when subscriptionType is "trial")
  trialDuration: z.number().min(1).max(365).optional(),
  trialCustomFee: z.number().min(0).optional(),
  trialNotes: z.string().optional(),
  
  // Contact Person
  contactName: z.string().min(2, "Contact name is required"),
  contactEmail: z.string().email("Invalid contact email"),
  contactPhone: z.string().min(10, "Contact phone is required"),
  
  // Additional Settings
  enableWhatsApp: z.boolean().default(false),
  whatsAppCredits: z.number().min(0).default(0),
  enableDelivery: z.boolean().default(false),
  maxTenants: z.number().min(1).default(1),
  maxUsers: z.number().min(1).default(5),
  
  // Notes
  adminNotes: z.string().optional(),
});

type NewCompanyForm = z.infer<typeof newCompanySchema>;

interface ApiCompanyResponse {
  id: string;
  name: string;
  domain: string;
  email: string;
  [key: string]: any;
}

interface NewCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUBSCRIPTION_PLANS = [
  { id: "basic", name: "Basic", price: 99, features: ["Up to 3 tenants", "Basic features", "Email support"] },
  { id: "professional", name: "Professional", price: 199, features: ["Up to 10 tenants", "Advanced features", "Priority support", "WhatsApp included"] },
  { id: "enterprise", name: "Enterprise", price: 399, features: ["Unlimited tenants", "All features", "24/7 support", "Custom integrations"] },
];

const TRIAL_DURATIONS = [
  { value: 30, label: "30 días" },
  { value: 60, label: "60 días" },
  { value: 90, label: "90 días" },
  { value: 120, label: "120 días" },
  { value: 180, label: "180 días" },
];

export function NewCompanyDialog({ open, onOpenChange }: NewCompanyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<NewCompanyForm>({
    resolver: zodResolver(newCompanySchema),
    defaultValues: {
      subscriptionType: "trial",
      trialDuration: 30,
      trialCustomFee: 0,
      enableWhatsApp: false,
      whatsAppCredits: 0,
      enableDelivery: false,
      maxTenants: 1,
      maxUsers: 5,
    },
  });

  const subscriptionType = form.watch("subscriptionType");
  const selectedPlan = form.watch("planId");

  const createCompanyMutation = useMutation({
    mutationFn: async (data: NewCompanyForm): Promise<ApiCompanyResponse> => {
      // Step 1: Create the company
      const companyData = {
        id: data.domain.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: data.name,
        domain: data.domain,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        taxId: data.taxId,
        settings: {
          maxTenants: data.maxTenants,
          maxUsers: data.maxUsers,
          enableWhatsApp: data.enableWhatsApp,
          enableDelivery: data.enableDelivery,
          contactPerson: {
            name: data.contactName,
            email: data.contactEmail,
            phone: data.contactPhone,
          },
          adminNotes: data.adminNotes,
        },
      };

      const company = await apiRequest('/api/superadmin/companies', 'POST', companyData) as unknown as ApiCompanyResponse;

      // Step 2: Create subscription or trial
      if (data.subscriptionType === "trial") {
        await apiRequest('/api/superadmin/companies/trial', 'POST', {
          companyId: company.id,
          duration: data.trialDuration,
          customFee: data.trialCustomFee,
          notes: data.trialNotes,
        }) as unknown as ApiCompanyResponse;
      } else if (data.subscriptionType === "direct_subscription" && data.planId) {
        await apiRequest('/api/superadmin/companies/subscription', 'POST', {
          companyId: company.id,
          planId: data.planId,
        }) as unknown as ApiCompanyResponse;
      }

      // Step 3: Setup WhatsApp credits if enabled
      if (data.enableWhatsApp && data.whatsAppCredits > 0) {
        await apiRequest('/api/superadmin/companies/whatsapp', 'POST', {
          companyId: company.id,
          credits: data.whatsAppCredits,
        }) as unknown as ApiCompanyResponse;
      }

      return company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/companies'] });
      toast({
        title: "Company created successfully",
        description: `${company.name} has been onboarded with ${subscriptionType === 'trial' ? 'trial access' : 'direct subscription'}.`,
      });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating company",
        description: error.message || "Failed to create company. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewCompanyForm) => {
    createCompanyMutation.mutate(data);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getSelectedPlanDetails = () => {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === selectedPlan) || SUBSCRIPTION_PLANS[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Nueva Empresa - Onboarding</span>
            <Badge variant="outline">Paso {currentStep} de 3</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-4 mb-6">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${currentStep >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                {currentStep > 1 ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium">Company Info</span>
            </div>
            <div className={`flex-1 h-px ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${currentStep >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                {currentStep > 2 ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium">Subscription</span>
            </div>
            <div className={`flex-1 h-px ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${currentStep >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Review</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Company Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>Company Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="VetCorp S.A." {...field} data-testid="input-company-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="domain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Domain/Subdomain</FormLabel>
                            <FormControl>
                              <Input placeholder="vetcorp" {...field} data-testid="input-company-domain" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="admin@vetcorp.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+52 81 1234 5678" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Av. Revolución 123, Col. Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Monterrey" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MX">México</SelectItem>
                                  <SelectItem value="US">United States</SelectItem>
                                  <SelectItem value="CA">Canada</SelectItem>
                                  <SelectItem value="CO">Colombia</SelectItem>
                                  <SelectItem value="AR">Argentina</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxId"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Tax ID (RFC/NIT) - Optional</FormLabel>
                            <FormControl>
                              <Input placeholder="XAXX010101000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Contact Person</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Dr. Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="juan.perez@vetcorp.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+52 81 9876 5432" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button type="button" onClick={nextStep}>
                      Next: Subscription Options
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Subscription/Trial Setup */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="subscriptionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Tabs value={field.value} onValueChange={field.onChange}>
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="trial" className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4" />
                                    <span>Trial Access</span>
                                  </TabsTrigger>
                                  <TabsTrigger value="direct_subscription" className="flex items-center space-x-2">
                                    <CreditCard className="w-4 h-4" />
                                    <span>Direct Subscription</span>
                                  </TabsTrigger>
                                </TabsList>

                                <TabsContent value="trial" className="space-y-4">
                                  <Card className="bg-yellow-50 border-yellow-200">
                                    <CardContent className="pt-6">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                          control={form.control}
                                          name="trialDuration"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Trial Duration</FormLabel>
                                              <FormControl>
                                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select duration" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {TRIAL_DURATIONS.map((duration) => (
                                                      <SelectItem key={duration.value} value={duration.value.toString()}>
                                                        {duration.label}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name="trialCustomFee"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Custom Trial Fee (USD)</FormLabel>
                                              <FormControl>
                                                <Input 
                                                  type="number" 
                                                  placeholder="0" 
                                                  {...field}
                                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name="trialNotes"
                                          render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                              <FormLabel>Trial Notes</FormLabel>
                                              <FormControl>
                                                <Textarea 
                                                  placeholder="Special conditions, custom pricing, contact agreements..." 
                                                  {...field} 
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </CardContent>
                                  </Card>
                                </TabsContent>

                                <TabsContent value="direct_subscription" className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {SUBSCRIPTION_PLANS.map((plan) => (
                                      <Card 
                                        key={plan.id} 
                                        className={`cursor-pointer transition-all hover:shadow-md ${selectedPlan === plan.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                                        onClick={() => form.setValue('planId', plan.id)}
                                      >
                                        <CardContent className="pt-6">
                                          <div className="text-center">
                                            <h3 className="text-lg font-semibold">{plan.name}</h3>
                                            <div className="text-2xl font-bold text-blue-600 my-2">
                                              ${plan.price}<span className="text-sm text-gray-500">/month</span>
                                            </div>
                                            <ul className="text-sm text-gray-600 space-y-1">
                                              {plan.features.map((feature, index) => (
                                                <li key={index} className="flex items-center justify-center">
                                                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                                                  {feature}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Additional Services */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Services & Limits</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Label>Enable WhatsApp Integration</Label>
                            <p className="text-sm text-gray-500">Automated messaging service</p>
                          </div>
                          <FormField
                            control={form.control}
                            name="enableWhatsApp"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("enableWhatsApp") && (
                          <FormField
                            control={form.control}
                            name="whatsAppCredits"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Initial WhatsApp Credits</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="1000" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Label>Enable Delivery Tracking</Label>
                            <p className="text-sm text-gray-500">Route optimization and tracking</p>
                          </div>
                          <FormField
                            control={form.control}
                            name="enableDelivery"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="maxTenants"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Tenants</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxUsers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Users</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Previous
                    </Button>
                    <Button type="button" onClick={nextStep}>
                      Next: Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Company Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">Company Name</Label>
                          <p className="text-sm">{form.watch("name")}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">Domain</Label>
                          <p className="text-sm">{form.watch("domain")}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">Email</Label>
                          <p className="text-sm">{form.watch("email")}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700">Contact Person</Label>
                          <p className="text-sm">{form.watch("contactName")} ({form.watch("contactEmail")})</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <Label className="text-sm font-semibold text-gray-700">Subscription Details</Label>
                        {subscriptionType === "trial" ? (
                          <div className="bg-yellow-50 p-3 rounded-lg mt-2">
                            <p className="text-sm">
                              <strong>Trial Access:</strong> {form.watch("trialDuration")} days
                              {(form.watch("trialCustomFee") || 0) > 0 && (
                                <span> - Custom fee: ${form.watch("trialCustomFee") || 0}</span>
                              )}
                            </p>
                            {form.watch("trialNotes") && (
                              <p className="text-sm text-gray-600 mt-1">{form.watch("trialNotes")}</p>
                            )}
                          </div>
                        ) : (
                          <div className="bg-blue-50 p-3 rounded-lg mt-2">
                            <p className="text-sm">
                              <strong>Direct Subscription:</strong> {getSelectedPlanDetails().name} Plan
                              <span> - ${getSelectedPlanDetails().price}/month</span>
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-4">
                        <Label className="text-sm font-semibold text-gray-700">Additional Services</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {form.watch("enableWhatsApp") && (
                            <Badge variant="secondary">
                              WhatsApp ({form.watch("whatsAppCredits")} credits)
                            </Badge>
                          )}
                          {form.watch("enableDelivery") && (
                            <Badge variant="secondary">Delivery Tracking</Badge>
                          )}
                          <Badge variant="outline">
                            Max {form.watch("maxTenants")} tenants
                          </Badge>
                          <Badge variant="outline">
                            Max {form.watch("maxUsers")} users  
                          </Badge>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="adminNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admin Notes (Internal)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Internal notes about this company, special agreements, contact history..." 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Previous
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createCompanyMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-create-company"
                    >
                      {createCompanyMutation.isPending ? 'Creating Company...' : 'Create Company'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}