import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppCopyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  message: string;
  paymentLink?: string;
  title?: string;
  description?: string;
}

export function WhatsAppCopyModal({
  open,
  onOpenChange,
  phoneNumber,
  message,
  paymentLink,
  title = "WhatsApp Message Ready",
  description = "Copy the information below and paste it in WhatsApp"
}: WhatsAppCopyModalProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedPayment, setCopiedPayment] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, type: 'message' | 'phone' | 'payment') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'message') setCopiedMessage(true);
      if (type === 'phone') setCopiedPhone(true);
      if (type === 'payment') setCopiedPayment(true);
      
      setTimeout(() => {
        if (type === 'message') setCopiedMessage(false);
        if (type === 'phone') setCopiedPhone(false);
        if (type === 'payment') setCopiedPayment(false);
      }, 2000);

      toast({
        title: "Copied!",
        description: `${type === 'message' ? 'Message' : type === 'phone' ? 'Phone number' : 'Payment link'} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openWhatsApp = () => {
    const encodedMessage = encodeURIComponent(message + (paymentLink ? `\n\nLink de pago: ${paymentLink}` : ''));
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="whatsapp-copy-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                value={phoneNumber}
                readOnly
                className="flex-1"
                data-testid="input-phone"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(phoneNumber, 'phone')}
                data-testid="button-copy-phone"
              >
                {copiedPhone ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <div className="flex flex-col gap-2">
              <Textarea
                id="message"
                value={message}
                readOnly
                className="min-h-[120px] resize-none"
                data-testid="textarea-message"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(message, 'message')}
                className="self-start"
                data-testid="button-copy-message"
              >
                {copiedMessage ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Message
              </Button>
            </div>
          </div>

          {/* Payment Link (if provided) */}
          {paymentLink && (
            <div className="space-y-2">
              <Label htmlFor="payment">Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  id="payment"
                  value={paymentLink}
                  readOnly
                  className="flex-1"
                  data-testid="input-payment-link"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(paymentLink, 'payment')}
                  data-testid="button-copy-payment"
                >
                  {copiedPayment ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={openWhatsApp}
              className="flex-1"
              data-testid="button-open-whatsapp"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Open WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              Close
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the phone number and message above</li>
              <li>Open WhatsApp (manually or click "Open WhatsApp")</li>
              <li>Start a chat with the phone number</li>
              <li>Paste the message</li>
              {paymentLink && <li>Include the payment link if needed</li>}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}