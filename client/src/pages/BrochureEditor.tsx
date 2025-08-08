import { useState } from "react";
import { useLocation } from "wouter";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Eye, 
  Download, 
  Image as ImageIcon,
  FileText,
  Palette,
  Save
} from "lucide-react";

interface BrochureSection {
  id: string;
  title: string;
  description: string;
  image?: string;
  content: string;
}

export default function BrochureEditor() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [brochureData, setBrochureData] = useState({
    title: "VetGroom - Plataforma de Gestión Veterinaria",
    subtitle: "Sistema Integral para Clínicas Veterinarias",
    companyName: "VetGroom Corp",
    contactInfo: {
      email: "info@vetgroom.com",
      phone: "+52 55 1234 5678",
      website: "www.vetgroom.com"
    }
  });

  const [sections, setSections] = useState<BrochureSection[]>([
    {
      id: "hero",
      title: "Portada Principal",
      description: "Imagen principal del brochure",
      content: "La plataforma más completa para la gestión de clínicas veterinarias"
    },
    {
      id: "features",
      title: "Características Principales", 
      description: "Imagen para la sección de características",
      content: "Sistema de citas, gestión de clientes, inventario médico, facturación integrada"
    },
    {
      id: "vrp-delivery",
      title: "Sistema VRP de Entregas",
      description: "Imagen del sistema de rutas optimizadas",
      content: "Optimización inteligente de rutas de entrega y recolección de mascotas"
    },
    {
      id: "integrations", 
      title: "Integraciones",
      description: "Imagen de integraciones con pagos y WhatsApp",
      content: "Stripe, WhatsApp, sistemas de pago, exportación de datos"
    },
    {
      id: "dashboard",
      title: "Dashboard Principal",
      description: "Captura de pantalla del dashboard",
      content: "Vista completa del panel de control con métricas en tiempo real"
    },
    {
      id: "mobile",
      title: "Aplicación Móvil",
      description: "Interface móvil y tablet",
      content: "Optimizado para tablets de 8+ pulgadas y dispositivos móviles"
    }
  ]);

  const handleImageUpload = (sectionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, image: imageUrl }
          : section
      ));
      toast({
        title: "Imagen subida",
        description: `Imagen para ${sections.find(s => s.id === sectionId)?.title} actualizada`
      });
    };
    reader.readAsDataURL(file);
  };

  const generateBrochure = () => {
    const brochureContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${brochureData.title}</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 0 auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); page-break-after: always; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
              .logo { font-size: 2.5em; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
              .subtitle { font-size: 1.2em; color: #666; margin-bottom: 5px; }
              .section { margin-bottom: 30px; padding: 20px; border-radius: 10px; background: #f8fafc; }
              .section h2 { color: #3b82f6; margin-bottom: 15px; font-size: 1.5em; }
              .section img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
              .section p { margin-bottom: 10px; }
              .contact-info { background: #3b82f6; color: white; padding: 20px; border-radius: 10px; text-align: center; }
              @media print { body { print-color-adjust: exact; } }
          </style>
      </head>
      <body>
          <div class="page">
              <div class="header">
                  <div class="logo">${brochureData.title}</div>
                  <div class="subtitle">${brochureData.subtitle}</div>
                  <div class="subtitle">por ${brochureData.companyName}</div>
              </div>
              
              ${sections.map(section => `
                  <div class="section">
                      <h2>${section.title}</h2>
                      ${section.image ? `<img src="${section.image}" alt="${section.title}" />` : ''}
                      <p>${section.content}</p>
                  </div>
              `).join('')}
              
              <div class="contact-info">
                  <h2>Información de Contacto</h2>
                  <p>📧 ${brochureData.contactInfo.email}</p>
                  <p>📞 ${brochureData.contactInfo.phone}</p>
                  <p>🌐 ${brochureData.contactInfo.website}</p>
              </div>
          </div>
      </body>
      </html>
    `;

    const blob = new Blob([brochureContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vetgroom-brochure.html';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Brochure generado",
      description: "El archivo HTML ha sido descargado"
    });
  };

  const previewBrochure = () => {
    const previewContent = sections.map(section => ({
      ...section,
      image: section.image || `https://via.placeholder.com/400x200/3b82f6/ffffff?text=${encodeURIComponent(section.title)}`
    }));

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Vista Previa - ${brochureData.title}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .preview { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
                .logo { font-size: 2.5em; font-weight: bold; color: #3b82f6; margin-bottom: 10px; }
                .subtitle { font-size: 1.2em; color: #666; }
                .section { margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 10px; }
                .section h2 { color: #3b82f6; margin-bottom: 15px; }
                .section img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }
                .contact { background: #3b82f6; color: white; padding: 20px; border-radius: 10px; text-align: center; margin-top: 30px; }
            </style>
        </head>
        <body>
            <div class="preview">
                <div class="header">
                    <div class="logo">${brochureData.title}</div>
                    <div class="subtitle">${brochureData.subtitle}</div>
                    <div class="subtitle">por ${brochureData.companyName}</div>
                </div>
                
                ${previewContent.map(section => `
                    <div class="section">
                        <h2>${section.title}</h2>
                        <img src="${section.image}" alt="${section.title}" />
                        <p>${section.content}</p>
                    </div>
                `).join('')}
                
                <div class="contact">
                    <h2>Información de Contacto</h2>
                    <p>📧 ${brochureData.contactInfo.email}</p>
                    <p>📞 ${brochureData.contactInfo.phone}</p>
                    <p>🌐 ${brochureData.contactInfo.website}</p>
                </div>
            </div>
        </body>
        </html>
      `);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <BackButton className="mb-4" />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editor de Brochure VetGroom</h1>
          <p className="text-gray-600">Personaliza tu brochure comercial con imágenes y contenido específico</p>
        </div>

        {/* Header Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Información General del Brochure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título Principal</Label>
                <Input 
                  value={brochureData.title}
                  onChange={(e) => setBrochureData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input 
                  value={brochureData.subtitle}
                  onChange={(e) => setBrochureData(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Email de Contacto</Label>
                <Input 
                  value={brochureData.contactInfo.email}
                  onChange={(e) => setBrochureData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input 
                  value={brochureData.contactInfo.phone}
                  onChange={(e) => setBrochureData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label>Sitio Web</Label>
                <Input 
                  value={brochureData.contactInfo.website}
                  onChange={(e) => setBrochureData(prev => ({ 
                    ...prev, 
                    contactInfo: { ...prev.contactInfo, website: e.target.value }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    {section.title}
                  </span>
                  <Badge variant="outline">{section.id}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Descripción de la Sección</Label>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                
                <div>
                  <Label>Contenido</Label>
                  <Textarea 
                    value={section.content}
                    onChange={(e) => setSections(prev => prev.map(s => 
                      s.id === section.id ? { ...s, content: e.target.value } : s
                    ))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Imagen de la Sección</Label>
                  <div className="mt-2">
                    {section.image && (
                      <div className="mb-3">
                        <img 
                          src={section.image} 
                          alt={section.title}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(section.id, file);
                      }}
                      className="hidden"
                      id={`image-${section.id}`}
                    />
                    <label htmlFor={`image-${section.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full cursor-pointer" 
                        asChild
                        data-testid={`button-upload-${section.id}`}
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          {section.image ? 'Cambiar Imagen' : 'Subir Imagen'}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                onClick={previewBrochure}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              
              <Button 
                onClick={generateBrochure}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar HTML
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setLocation("/superadmin/reports")}
                data-testid="button-back-reports"
              >
                <FileText className="w-4 h-4 mr-2" />
                Volver a Reportes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}