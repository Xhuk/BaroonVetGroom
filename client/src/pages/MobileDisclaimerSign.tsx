import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertCircle,
  CheckCircle,
  PenTool,
  Trash2,
  Download
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MedicalAppointment, Pet, Client } from "@shared/schema";

export default function MobileDisclaimerSign() {
  const params = useParams();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isSigned, setIsSigned] = useState(false);
  const [signatureExists, setSignatureExists] = useState(false);
  
  const disclaimerId = params.disclaimerId as string;
  const appointmentId = params.appointmentId as string;

  // Get disclaimer details
  const { data: disclaimer, isLoading: disclaimerLoading } = useQuery<any>({
    queryKey: ["/api/disclaimers", disclaimerId],
    enabled: !!disclaimerId,
  });

  // Get appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery<MedicalAppointment>({
    queryKey: ["/api/medical-appointments", appointmentId],
    enabled: !!appointmentId,
  });

  const { data: pet } = useQuery<Pet>({
    queryKey: ["/api/pets", appointment?.petId],
    enabled: !!appointment?.petId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", appointment?.clientId],
    enabled: !!appointment?.clientId,
  });

  // Pre-populate client info when available
  useEffect(() => {
    if (client && !clientName) {
      setClientName(client.name);
      setClientEmail(client.email || "");
    }
  }, [client, clientName]);

  // Initialize canvas for signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // High DPI
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2); // High DPI scaling
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
    }
  }, []);

  // Signature drawing functions
  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true);
    setSignatureExists(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling while drawing
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureExists(false);
    }
  };

  // Save signed disclaimer
  const saveSignatureMutation = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current;
      if (!canvas || !signatureExists) {
        throw new Error("No signature provided");
      }

      const signatureDataUrl = canvas.toDataURL('image/png');
      
      return await apiRequest("POST", `/api/disclaimers/${disclaimerId}/sign`, {
        appointmentId,
        clientName,
        clientEmail,
        signatureData: signatureDataUrl,
        signedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      setIsSigned(true);
      toast({
        title: "Consentimiento firmado",
        description: "El consentimiento ha sido firmado exitosamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo guardar la firma. Intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!clientName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese su nombre",
        variant: "destructive",
      });
      return;
    }

    if (!signatureExists) {
      toast({
        title: "Error", 
        description: "Por favor firme en el área correspondiente",
        variant: "destructive",
      });
      return;
    }

    saveSignatureMutation.mutate();
  };

  const downloadSignedDisclaimer = () => {
    if (!disclaimer || !signatureExists) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a new window for printing with the signed disclaimer
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const signatureDataUrl = canvas.toDataURL('image/png');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Consentimiento Firmado</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .content { margin-bottom: 40px; }
            .signature-section { border-top: 1px solid #ccc; padding-top: 30px; }
            .signature-image { max-width: 300px; border: 1px solid #ccc; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${disclaimer.title}</h1>
            <p><strong>Cliente:</strong> ${clientName}</p>
            <p><strong>Mascota:</strong> ${pet?.name || ''}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          </div>
          <div class="content">
            ${disclaimer.content.replace(/\n/g, '<br>')}
          </div>
          <div class="signature-section">
            <p><strong>Firma del cliente:</strong></p>
            <img src="${signatureDataUrl}" alt="Firma" class="signature-image" />
            <p>Nombre: ${clientName}</p>
            <p>Email: ${clientEmail || 'No proporcionado'}</p>
            <p>Fecha de firma: ${new Date().toLocaleString('es-ES')}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  if (disclaimerLoading || appointmentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando consentimiento...</p>
        </div>
      </div>
    );
  }

  if (!disclaimer || !appointment) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Consentimiento no encontrado</h2>
            <p className="text-gray-600">
              No se pudo encontrar la información de este consentimiento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSigned) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-green-800">¡Consentimiento Firmado!</h2>
              <p className="text-gray-600 mb-4">
                El consentimiento médico ha sido firmado exitosamente.
              </p>
              <Button onClick={downloadSignedDisclaimer} className="mb-2">
                <Download className="w-4 h-4 mr-2" />
                Descargar copia firmada
              </Button>
              <div className="text-sm text-gray-500">
                <p>Cliente: {clientName}</p>
                <p>Mascota: {pet?.name}</p>
                <p>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <FileText className="w-6 h-6" />
              Consentimiento Médico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div>
                <Badge variant="outline" className="mb-2">
                  Firma Digital
                </Badge>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{disclaimer.title}</h3>
                <p className="text-sm text-gray-600">{pet?.name} - {client?.name}</p>
                <p className="text-xs text-gray-500">
                  {appointment.visitDate ? new Date(appointment.visitDate).toLocaleDateString('es-ES') : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido del Consentimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: disclaimer.content.replace(/\n/g, '<br>') 
              }} />
            </div>
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre completo *</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Su nombre completo"
                data-testid="input-client-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email (opcional)</label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="su.email@ejemplo.com"
                data-testid="input-client-email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        {disclaimer.requiresSignature && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5" />
                Firma Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Por favor firme en el área de abajo usando su dedo o stylus.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-32 touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  data-testid="button-clear-signature"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
                <span className="text-xs text-gray-500 self-center">
                  {signatureExists ? "✓ Firma capturada" : "Área de firma"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSubmit}
              disabled={saveSignatureMutation.isPending || (!disclaimer.requiresSignature ? false : !signatureExists)}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-submit-disclaimer"
            >
              {saveSignatureMutation.isPending ? "Guardando..." : "Firmar Consentimiento"}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              Al firmar este consentimiento, acepta los términos y condiciones descritos arriba.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}