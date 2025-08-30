import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Download, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRCodeGeneratorProps {
  appointmentId: string;
  appointmentType?: string;
  size?: number;
}

export function QRCodeGenerator({ appointmentId, appointmentType = "medical", size = 256 }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [appointmentId]);

  const generateQRCode = async () => {
    try {
      // Create the upload URL that will be used in the QR code
      // Make sure it's an absolute URL for better mobile compatibility
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/upload/${appointmentType}/${appointmentId}`;
      setUploadUrl(url);

      // Generate QR code with mobile-optimized settings
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: size,
        margin: 2, // Increased margin for better mobile scanning
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M', // Medium error correction for better mobile compatibility
        type: 'image/png',
        quality: 0.92
      });
      
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el código QR",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(uploadUrl);
      toast({
        title: "Copiado",
        description: "URL copiada al portapapeles",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo copiar la URL",
        variant: "destructive"
      });
    }
  };

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `qr-cita-${appointmentId}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5" />
          Subir Archivos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Escanea para subir desde móvil
        </p>
      </CardHeader>
      <CardContent className="text-center">
        {qrCodeUrl && (
          <div className="mb-4">
            <img 
              src={qrCodeUrl} 
              alt="QR Code para subir archivos" 
              className="mx-auto border rounded-lg"
            />
          </div>
        )}
        
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            data-testid="button-copy-url"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadQR}
            data-testid="button-download-qr"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          Rayos X, laboratorios, fotografías
        </p>
      </CardContent>
    </Card>
  );
}