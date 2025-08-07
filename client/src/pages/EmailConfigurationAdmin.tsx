import { useState, useEffect, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Mail, Send, CheckCircle, XCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

const emailConfigSchema = z.object({
  provider: z.enum(['resend', 'sendgrid', 'ses']),
  apiKey: z.string().min(1, 'API Key is required'),
  fromEmail: z.string().email('Valid email required'),
  fromName: z.string().min(1, 'From name is required'),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

interface EmailConfig {
  provider: string;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  isConfigured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EmailLog {
  id: string;
  emailType: string;
  recipientEmail: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt?: string;
  createdAt: string;
}

// Memoized loading skeleton component for better performance
const ConfigurationSkeleton = memo(() => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  </div>
));

function EmailConfigurationAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState('');

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      provider: 'resend',
      apiKey: '',
      fromEmail: '',
      fromName: 'VetGroom',
    },
  });

  // Fastload optimization: Fetch email configuration with aggressive caching
  const { data: emailConfig, isLoading: configLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/superadmin/email-config'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });

  // Fastload optimization: Fetch email logs with stale-while-revalidate pattern
  const { data: emailLogs = [], isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['/api/superadmin/email-logs'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Update form when config loads
  useEffect(() => {
    if (emailConfig) {
      form.reset({
        provider: emailConfig.provider as any,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        apiKey: '', // Don't populate API key for security
      });
    }
  }, [emailConfig, form]);

  // Save email configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EmailConfigForm) => {
      const response = await fetch('/api/superadmin/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save email configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "Email configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email-config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email configuration",
        variant: "destructive",
      });
    },
  });

  // Send test email
  const testEmailMutation = useMutation({
    mutationFn: async (recipientEmail: string) => {
      const response = await fetch('/api/superadmin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientEmail }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test email');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: "Test email has been sent successfully.",
      });
      setTestEmail('');
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/email-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }
    testEmailMutation.mutate(testEmail);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription_reminder':
        return 'Subscription Reminder';
      case 'subscription_expired':
        return 'Subscription Expired';
      case 'test_email':
        return 'Test Email';
      default:
        return type;
    }
  };

  // Early return with skeleton during loading for fastload optimization
  if (configLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <ConfigurationSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" data-testid="email-config-admin">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/superadmin" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <Mail className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold">Email Configuration</h1>
              <p className="text-gray-400">Manage email providers and subscription notifications</p>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <Card className="bg-gray-800 border-gray-700" data-testid="config-status-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-300">
              {emailConfig?.isConfigured ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge 
                variant={emailConfig?.isConfigured ? "default" : "secondary"}
                className={emailConfig?.isConfigured ? "bg-green-600" : ""}
                data-testid="config-status"
              >
                {emailConfig?.isConfigured ? 'Configured' : 'Not Configured'}
              </Badge>
              {emailConfig?.provider && (
                <Badge variant="outline" className="border-gray-600 text-gray-300" data-testid="provider-badge">
                  Provider: {emailConfig.provider}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Email Configuration Form */}
          <Card className="bg-gray-800 border-gray-700" data-testid="config-form-card">
            <CardHeader>
              <CardTitle className="text-blue-300">Provider Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Configure your email service provider for subscription notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger 
                              data-testid="provider-select"
                              className="bg-gray-700 border-gray-600 text-white"
                            >
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="resend">Resend</SelectItem>
                            <SelectItem value="sendgrid">SendGrid</SelectItem>
                            <SelectItem value="ses">Amazon SES</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter API key" 
                            {...field}
                            data-testid="api-key-input"
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">From Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="notifications@vetgroom.com" 
                            {...field}
                            data-testid="from-email-input"
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">From Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="VetGroom" 
                            {...field}
                            data-testid="from-name-input"
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={saveConfigMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    data-testid="save-config-button"
                  >
                    {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Test Email Section */}
          <Card className="bg-gray-800 border-gray-700" data-testid="test-email-card">
            <CardHeader>
              <CardTitle className="text-blue-300">Test Email</CardTitle>
              <CardDescription className="text-gray-400">
                Send a test email to verify your configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-email" className="text-gray-300">Recipient Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  data-testid="test-email-input"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <Button 
                onClick={handleTestEmail}
                disabled={testEmailMutation.isPending || !emailConfig?.isConfigured}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="send-test-button"
              >
                <Send className="w-4 h-4 mr-2" />
                {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
              </Button>
              
              {!emailConfig?.isConfigured && (
                <p className="text-sm text-yellow-400">
                  ⚠️ Configure email provider first before testing
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Email Logs */}
        <Card className="bg-gray-800 border-gray-700" data-testid="email-logs-card">
          <CardHeader>
            <CardTitle className="text-blue-300">Email Logs</CardTitle>
            <CardDescription className="text-gray-400">
              Recent email activity and delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-gray-700" />
                ))}
              </div>
            ) : emailLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Recipient</TableHead>
                      <TableHead className="text-gray-300">Subject</TableHead>
                      <TableHead className="text-gray-300">Status</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id} className="border-gray-700">
                        <TableCell className="text-gray-300">
                          {getEmailTypeLabel(log.emailType)}
                        </TableCell>
                        <TableCell className="text-gray-300">{log.recipientEmail}</TableCell>
                        <TableCell className="text-gray-300">{log.subject}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(log.sentAt || log.createdAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>No email logs yet</p>
                <p className="text-sm">Sent emails will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(EmailConfigurationAdmin);