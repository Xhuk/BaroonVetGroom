import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Mail, Send, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

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

export default function EmailConfigurationAdmin() {
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

  // Fetch email configuration
  const { data: emailConfig, isLoading: configLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/superadmin/email-config'],
    retry: false,
  });

  // Fetch email logs
  const { data: emailLogs = [], isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['/api/superadmin/email-logs'],
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
    mutationFn: (data: EmailConfigForm) => 
      apiRequest('/api/superadmin/email-config', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
    mutationFn: (recipientEmail: string) => 
      apiRequest('/api/superadmin/test-email', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail }),
      }),
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6" data-testid="email-config-admin">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold">Email Configuration</h1>
            <p className="text-gray-400">Manage email providers and subscription notifications</p>
          </div>
        </div>

        {/* Configuration Status */}
        <Card className="bg-gray-800 border-gray-700" data-testid="config-status-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                <Badge variant="outline" data-testid="provider-badge">
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
              <CardTitle>Provider Configuration</CardTitle>
              <CardDescription>
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
                        <FormLabel>Email Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="provider-select">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter API key" 
                            {...field}
                            data-testid="api-key-input"
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
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="notifications@vetgroom.com" 
                            {...field}
                            data-testid="from-email-input"
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
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="VetGroom" 
                            {...field}
                            data-testid="from-name-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={saveConfigMutation.isPending}
                    data-testid="save-config-button"
                  >
                    {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card className="bg-gray-800 border-gray-700" data-testid="test-email-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Test Email
              </CardTitle>
              <CardDescription>
                Send a test subscription reminder email to verify configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient Email</label>
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="mt-1"
                    data-testid="test-email-input"
                  />
                </div>
                <Button 
                  onClick={handleTestEmail}
                  disabled={testEmailMutation.isPending || !emailConfig?.isConfigured}
                  className="w-full"
                  data-testid="send-test-email-button"
                >
                  {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                </Button>
                {!emailConfig?.isConfigured && (
                  <p className="text-sm text-yellow-500">
                    Configure email provider first to send test emails
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Logs */}
        <Card className="bg-gray-800 border-gray-700" data-testid="email-logs-card">
          <CardHeader>
            <CardTitle>Email Logs</CardTitle>
            <CardDescription>
              Recent email activity and delivery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8">Loading email logs...</div>
            ) : emailLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No email logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id} className="border-gray-700" data-testid={`email-log-${log.id}`}>
                        <TableCell>
                          <Badge variant="outline">{getEmailTypeLabel(log.emailType)}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.recipientEmail}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}