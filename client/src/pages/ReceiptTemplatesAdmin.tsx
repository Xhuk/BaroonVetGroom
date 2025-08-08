import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  Download, 
  FileText, 
  Building, 
  MapPin, 
  Trash2, 
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Wand2,
  ArrowRight,
  ArrowLeft,
  Palette,
  Layout,
  FileImage,
  Type,
  Signature,
  Package,
  Zap,
  MousePointer,
  CloudUpload,
  ChevronLeft,
  Maximize2,
  X,
  Image,
  Percent,
  QrCode,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface ReceiptTemplate {
  id: string;
  companyId?: string;
  tenantId?: string;
  name: string;
  description?: string;
  templateType: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  version: string;
  isActive: boolean;
  uploadedBy?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export default function ReceiptTemplatesAdmin() {
  const [activeTab, setActiveTab] = useState("wizard");
  const [wizardStep, setWizardStep] = useState(1);
  const [facturaType, setFacturaType] = useState<"empresarial" | "clinica">("empresarial");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Step 2: Configuration options
  const [templateConfig, setTemplateConfig] = useState({
    colorScheme: "blue",
    logoPosition: "left",
    logoOpacity: 100,
    logoSize: "medium",
    preserveLogoTransparency: true,
    enterpriseName: "Clínica Veterinaria San Marcos",
    enterpriseSlogan: "Cuidamos a tu mejor amigo"
  });

  // Step 3: QR Code options
  const [qrConfig, setQrConfig] = useState({
    enabled: false,
    position: "left", // left, right
    size: "medium" // small, medium, large
  });

  // Hardcoded template data - not customizable (except enterprise info)
  const hardcodedData = {
    empresaTelefono: "(555) 123-4567",
    empresaWeb: "www.vetclinica.com",
    empresaDireccion: "Av. Revolución 123, Ciudad de México",
    numeroRecibo: "VET-2025-0001",
    fecha: "07 de Agosto, 2025",
    hora: "10:30 AM",
    veterinario: "Dr. Ana García",
    clienteNombre: "María González",
    clienteTelefono: "(555) 987-6543",
    mascotaNombre: "Max (Golden Retriever)",
    articulos: [
      { servicio: "Consulta Veterinaria General", precio: "$400.00" },
      { servicio: "Vacunación Múltiple", precio: "$280.00" },
      { servicio: "Estética y Baño Completo", precio: "$350.00" },
      { servicio: "Desparasitación Interna", precio: "$150.00" },
      { servicio: "Limpieza Dental", precio: "$320.00" },
      { servicio: "Análisis de Sangre Completo", precio: "$450.00" },
      { servicio: "Radiografía (2 placas)", precio: "$380.00" },
      { servicio: "Cirugía Menor", precio: "$800.00" }
    ],
    total: "$3,130.00"
  };
  
  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Color scheme mapping function
  const getColorValue = (colorScheme: string) => {
    const colorMap: { [key: string]: string } = {
      blue: '#3b82f6',
      green: '#10b981',
      purple: '#8b5cf6',
      red: '#ef4444',
      orange: '#f97316',
      indigo: '#6366f1',
      teal: '#14b8a6',
      pink: '#ec4899'
    };
    return colorMap[colorScheme] || '#3b82f6';
  };

  // Generate QR Code HTML for footer integration
  const generateQrCodeHtml = () => {
    if (!qrConfig.enabled) return '';
    
    const qrSize = {
      small: '50px',
      medium: '60px',
      large: '70px'
    }[qrConfig.size];

    return `
      <div style="display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 6px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
          <div style="width: ${qrSize}; height: ${qrSize}; background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iNTYiIHk9IjgiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0iIzAwMCIvPgo8cmVjdCB4PSI4IiB5PSI1NiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjMDAwIi8+CjxyZWN0IHg9IjMyIiB5PSIzMiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjMDAwIi8+CjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzAwMCIvPgo8cmVjdCB4PSI0OCIgeT0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTYiIHk9IjQ4IiB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIi8+CjwvdGc+Cjwvc3ZnPgo=') center/contain no-repeat; border: 1px solid #e5e7eb;"></div>
          <p style="margin: 4px 0 0; font-size: 9px; text-align: center; color: #6b7280; white-space: nowrap;">Recibo #${hardcodedData.numeroRecibo}</p>
        </div>
      </div>
    `;
  };

  // Fetch companies for selection
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
  });

  // Fetch tenants for selected company
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ['/api/tenants', selectedCompanyId],
    enabled: !!selectedCompanyId && facturaType === "clinica",
  });

  // Fetch receipt templates
  const { data: templates = [], isLoading } = useQuery<ReceiptTemplate[]>({
    queryKey: ['/api/admin/receipt-templates', { 
      companyId: facturaType === "empresarial" ? selectedCompanyId : undefined,
      tenantId: facturaType === "clinica" ? selectedTenantId : undefined 
    }],
    enabled: facturaType === "empresarial" ? !!selectedCompanyId : !!selectedTenantId,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return apiRequest('/api/admin/receipt-templates', 'POST', templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/receipt-templates'] });
      toast({
        title: "Éxito",
        description: "Plantilla de recibo creada correctamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear la plantilla",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return apiRequest(`/api/admin/receipt-templates/${templateId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/receipt-templates'] });
      toast({
        title: "Éxito",
        description: "Plantilla eliminada correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar la plantilla",
        variant: "destructive",
      });
    },
  });

  // Pre-designed templates data (moved to top to avoid initialization issues)
  const preDesignedTemplates = [
    {
      id: "header-professional",
      name: "Estilo Profesional con Logo",
      description: "Encabezado corporativo con logo personalizable y gradiente elegante",
      preview: "/assets/template-preview-1.png",
      features: ["Logo personalizable", "Gradiente dinámico", "Información estructurada", "Aspecto corporativo"],
      htmlPreview: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid ${getColorValue(templateConfig.colorScheme)}; border-radius: 8px; overflow: hidden; background: white; position: relative;">
          <!-- Professional Header Style with Dynamic Color Scheme -->
          <div style="background: ${getColorValue(templateConfig.colorScheme)}; color: white; padding: 24px;">
            <!-- Dynamic Logo Position -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              ${templateConfig.logoPosition === 'left' ? `
              <div>
                ${logoUrl ? 
                  `<img src="${logoUrl}" alt="Logo" style="width: ${templateConfig.logoSize === 'small' ? '40px' : templateConfig.logoSize === 'large' ? '70px' : '50px'}; height: ${templateConfig.logoSize === 'small' ? '40px' : templateConfig.logoSize === 'large' ? '70px' : '50px'}; object-fit: ${templateConfig.preserveLogoTransparency ? 'contain' : 'cover'}; margin-bottom: 12px; opacity: ${templateConfig.logoOpacity / 100}; border-radius: 4px;" />` :
                  '' // No logo placeholder when no logo is uploaded
                }
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${templateConfig.enterpriseName}</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${templateConfig.enterpriseSlogan}</p>
              </div>
              <div style="text-align: right;">
                <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 4px; margin-bottom: 8px;">
                  <span style="font-size: 18px; font-weight: bold;">RECIBO</span>
                </div>
                <p style="margin: 0; font-size: 14px;"># ${hardcodedData.numeroRecibo}</p>
              </div>` : `
              <div style="text-align: center; flex: 1;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${templateConfig.enterpriseName}</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${templateConfig.enterpriseSlogan}</p>
                ${logoUrl ? 
                  `<img src="${logoUrl}" alt="Logo" style="width: ${templateConfig.logoSize === 'small' ? '40px' : templateConfig.logoSize === 'large' ? '70px' : '50px'}; height: ${templateConfig.logoSize === 'small' ? '40px' : templateConfig.logoSize === 'large' ? '70px' : '50px'}; object-fit: ${templateConfig.preserveLogoTransparency ? 'contain' : 'cover'}; margin: 12px auto; opacity: ${templateConfig.logoOpacity / 100}; border-radius: 4px; display: block;" />` :
                  '' // No logo placeholder when no logo is uploaded
                }
              </div>
              <div style="text-align: right;">
                <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 4px; margin-bottom: 8px;">
                  <span style="font-size: 18px; font-weight: bold;">RECIBO</span>
                </div>
                <p style="margin: 0; font-size: 14px;"># ${hardcodedData.numeroRecibo}</p>
              </div>`}
            </div>
          </div>
          
          <div style="padding: 24px;">
            <!-- Client and Service Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
              <div>
                <h3 style="color: ${getColorValue(templateConfig.colorScheme)}; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Cliente</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Nombre:</strong> ${hardcodedData.clienteNombre}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Teléfono:</strong> ${hardcodedData.clienteTelefono}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Mascota:</strong> ${hardcodedData.mascotaNombre}</p>
              </div>
              <div>
                <h3 style="color: ${getColorValue(templateConfig.colorScheme)}; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Información</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Fecha:</strong> ${hardcodedData.fecha}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Hora:</strong> ${hardcodedData.hora}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Veterinario:</strong> ${hardcodedData.veterinario}</p>
              </div>
            </div>

            <!-- Services Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: ${getColorValue(templateConfig.colorScheme)}; color: white;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Servicio</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600;">Cant.</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${hardcodedData.articulos.map((articulo, index) => `
                <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background: #f9fafb;' : ''}">
                  <td style="padding: 10px;">${articulo.servicio}</td>
                  <td style="padding: 10px; text-align: center;">1</td>
                  <td style="padding: 10px; text-align: right;">${articulo.precio}</td>
                </tr>`).join('')}
                <tr style="background: #eff6ff; border: 2px solid ${getColorValue(templateConfig.colorScheme)};">
                  <td style="padding: 12px; font-weight: bold; color: ${getColorValue(templateConfig.colorScheme)};">TOTAL</td>
                  <td style="padding: 12px;"></td>
                  <td style="padding: 12px; font-weight: bold; text-align: right; color: ${getColorValue(templateConfig.colorScheme)}; font-size: 18px;">${hardcodedData.total}</td>
                </tr>
              </tbody>
            </table>

            <!-- Signature Area -->
            <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="text-align: center;">
                  <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 40px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Firma del Cliente</p>
                </div>
                <div style="text-align: center;">
                  <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 40px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Firma del Veterinario</p>
                </div>
              </div>
            </div>

            <!-- Footer with QR Code -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                ${qrConfig.position === 'left' ? generateQrCodeHtml() : ''}
                <div style="text-align: center; flex: 1;">
                  <p style="margin: 4px 0; font-size: 13px;">${hardcodedData.empresaWeb} | ${hardcodedData.empresaTelefono}</p>
                  <p style="margin: 4px 0; font-size: 12px;">${hardcodedData.empresaDireccion}</p>
                </div>
                ${qrConfig.position === 'right' ? generateQrCodeHtml() : ''}
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "simple-text-only",
      name: "Solo Texto Profesional",
      description: "Diseño limpio y profesional sin logo, solo texto y colores",
      preview: "/assets/template-preview-2.png",
      features: ["Sin logo requerido", "Diseño minimalista", "Solo colores personalizables", "Tipografía profesional"],
      htmlPreview: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid ${getColorValue(templateConfig.colorScheme)}; border-radius: 8px; overflow: hidden; background: white; position: relative;">
          <!-- Simple Header without Logo -->
          <div style="background: ${getColorValue(templateConfig.colorScheme)}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${templateConfig.enterpriseName}</h1>
            <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">${templateConfig.enterpriseSlogan}</p>
            <div style="margin-top: 16px; background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 6px; display: inline-block;">
              <span style="font-size: 20px; font-weight: bold;">RECIBO</span>
              <span style="margin-left: 12px; font-size: 16px;"># ${hardcodedData.numeroRecibo}</span>
            </div>
          </div>
          
          <div style="padding: 24px;">
            <!-- Client and Service Info -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
              <div>
                <h3 style="color: ${getColorValue(templateConfig.colorScheme)}; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Cliente</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Nombre:</strong> ${hardcodedData.clienteNombre}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Teléfono:</strong> ${hardcodedData.clienteTelefono}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Mascota:</strong> ${hardcodedData.mascotaNombre}</p>
              </div>
              <div>
                <h3 style="color: ${getColorValue(templateConfig.colorScheme)}; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Información</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Fecha:</strong> ${hardcodedData.fecha}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Hora:</strong> ${hardcodedData.hora}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Veterinario:</strong> ${hardcodedData.veterinario}</p>
              </div>
            </div>

            <!-- Services Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: ${getColorValue(templateConfig.colorScheme)}; color: white;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Servicio</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600;">Cant.</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${hardcodedData.articulos.map((articulo, index) => `
                <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background: #f9fafb;' : ''}">
                  <td style="padding: 10px;">${articulo.servicio}</td>
                  <td style="padding: 10px; text-align: center;">1</td>
                  <td style="padding: 10px; text-align: right;">${articulo.precio}</td>
                </tr>`).join('')}
                <tr style="background: #eff6ff; border: 2px solid ${getColorValue(templateConfig.colorScheme)};">
                  <td style="padding: 12px; font-weight: bold; color: ${getColorValue(templateConfig.colorScheme)};">TOTAL</td>
                  <td style="padding: 12px;"></td>
                  <td style="padding: 12px; font-weight: bold; text-align: right; color: ${getColorValue(templateConfig.colorScheme)}; font-size: 18px;">${hardcodedData.total}</td>
                </tr>
              </tbody>
            </table>

            <!-- Signature Area -->
            <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="text-align: center;">
                  <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 40px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Firma del Cliente</p>
                </div>
                <div style="text-align: center;">
                  <div style="border-bottom: 1px solid #9ca3af; margin-bottom: 8px; height: 40px;"></div>
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">Firma del Veterinario</p>
                </div>
              </div>
            </div>

            <!-- Footer with QR Code -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                ${qrConfig.position === 'left' ? generateQrCodeHtml() : ''}
                <div style="text-align: center; flex: 1;">
                  <p style="margin: 4px 0; font-size: 13px;">${hardcodedData.empresaWeb} | ${hardcodedData.empresaTelefono}</p>
                  <p style="margin: 4px 0; font-size: 12px;">${hardcodedData.empresaDireccion}</p>
                </div>
                ${qrConfig.position === 'right' ? generateQrCodeHtml() : ''}
              </div>
            </div>
          </div>
        </div>
      `
    }
  ];

  // Check if selected template has logo placeholders
  const templateHasLogo = (templateId: string) => {
    const template = preDesignedTemplates.find(t => t.id === templateId);
    if (!template?.htmlPreview) return false;
    
    return template.htmlPreview.includes('logoUrl') || 
           template.htmlPreview.includes('${logoUrl') ||
           template.htmlPreview.includes('logo') ||
           template.features?.some(feature => feature.toLowerCase().includes('logo'));
  };

  const selectedTemplateHasLogo = selectedTemplate ? templateHasLogo(selectedTemplate) : false;

  // Logo upload functions
  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    setUploadingLogo(true);
    try {
      // Check if it's PNG for transparency detection
      const isPng = file.type === 'image/png';
      if (isPng) {
        setTemplateConfig(prev => ({ ...prev, preserveLogoTransparency: true }));
      }

      // Get upload URL
      const response = await apiRequest('/api/objects/upload', 'POST') as unknown as { uploadURL: string };
      
      // Upload file directly to object storage
      const uploadResponse = await fetch(response.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload logo');
      }

      // Set the logo URL (extract from the upload URL)
      const uploadUrl = response.uploadURL;
      console.log('Upload URL received:', uploadUrl);
      
      try {
        const url = new URL(uploadUrl);
        const logoPath = url.pathname;
        console.log('Extracted path:', logoPath);
        
        // Extract the object path from the GCS URL
        const pathMatch = logoPath.match(/\/([^/]+\/.+)$/);
        if (pathMatch) {
          const objectPath = `/objects/${pathMatch[1].replace(/^[^/]+\//, '')}`;
          console.log('Final logo URL:', objectPath);
          setLogoUrl(objectPath);
        } else {
          // Fallback: use the full upload URL temporarily
          setLogoUrl(uploadUrl);
        }
        setLogoFile(file);
      } catch (error) {
        console.error('Error parsing upload URL:', error);
        // Use the upload URL directly as fallback
        setLogoUrl(uploadUrl);
        setLogoFile(file);
      }

      toast({
        title: "Logo subido",
        description: "Tu logo se ha subido correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir el logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleLogoUpload(files[0]);
    }
  };

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleLogoUpload(files[0]);
    }
  };

  const generateTemplate = () => {
    if (!selectedTemplate) return "";
    
    const template = preDesignedTemplates.find(t => t.id === selectedTemplate);
    if (!template?.htmlPreview) return "";
    
    return template.htmlPreview;
  };

  const resetForm = () => {
    setWizardStep(1);
    setTemplateName("");
    setTemplateDescription("");
    setSelectedFile(null);
    setSelectedTemplate("");
    setLogoUrl("");
    setLogoFile(null);
    setTemplateConfig({
      colorScheme: "blue",
      logoPosition: "left",
      logoOpacity: 100,
      logoSize: "medium",
      preserveLogoTransparency: true,
      enterpriseName: "Clínica Veterinaria San Marcos",
      enterpriseSlogan: "Cuidamos a tu mejor amigo"
    });
    setQrConfig({
      enabled: false,
      position: "bottom-right",
      size: "medium"
    });
  };

  const handleCreateTemplate = async () => {
    const requiresLogo = templateHasLogo(selectedTemplate);
    
    if (!templateName || !selectedTemplate || (requiresLogo && !logoUrl)) {
      toast({
        title: "Error",
        description: requiresLogo 
          ? "Por favor completa todos los campos requeridos, incluyendo el logo"
          : "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      const newTemplateData = {
        name: templateName,
        description: templateDescription,
        templateType: "custom",
        metadata: {
          generatedFrom: selectedTemplate,
          customization: templateConfig,
          qrConfig: qrConfig,
          hardcodedData: hardcodedData,
          facturaType: facturaType,
          logoUrl: logoUrl
        },
        fileUrl: generateTemplate(),
        fileName: `${templateName.replace(/\s+/g, '_').toLowerCase()}_template.html`,
        version: "1.0",
        isActive: true,
        ...(facturaType === "empresarial" ? { companyId: selectedCompanyId } : { tenantId: selectedTenantId })
      };

      await createTemplateMutation.mutateAsync(newTemplateData);
    } catch (error) {
      console.error('Error creating template:', error);
    } finally {
      setUploading(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (wizardStep) {
      case 1:
        return selectedTemplate !== "";
      case 2:
        const requiresLogo = templateHasLogo(selectedTemplate);
        return templateConfig.enterpriseName && templateConfig.enterpriseSlogan && (!requiresLogo || logoUrl);
      case 3:
        return true; // QR step is always optional
      case 4:
        return templateName && ((facturaType === "empresarial" && selectedCompanyId) || (facturaType === "clinica" && selectedTenantId));
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (wizardStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-600" />
                Paso 1: Selecciona el Formato de Plantilla
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Elige el formato base para tu recibo. Cada plantilla tiene características específicas.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {preDesignedTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedTemplate === template.id 
                      ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50 dark:bg-blue-950/30' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate === template.id && (
                        <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Live Preview Card */}
                      <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>Vista Previa</span>
                        </div>
                        <div 
                          className="scale-[0.28] origin-top-left overflow-hidden bg-white rounded border shadow-sm"
                          style={{ 
                            width: '357%', // Scale up to compensate for scale down
                            height: '180px',
                            transform: 'scale(0.28)',
                            transformOrigin: 'top left'
                          }}
                        >
                          <div 
                            dangerouslySetInnerHTML={{ __html: template.htmlPreview }}
                            style={{ 
                              pointerEvents: 'none',
                              fontSize: '14px',
                              lineHeight: '1.3'
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {template.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Selection Indicator */}
                      {selectedTemplate === template.id && (
                        <div className="pt-3 border-t">
                          <Badge className="bg-blue-500 w-full justify-center py-2">
                            ✓ Formato Seleccionado
                          </Badge>
                        </div>
                      )}
                      
                      {/* Full Preview Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(template.htmlPreview);
                          setShowPreview(true);
                        }}
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Ver Tamaño Completo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedTemplate && templateHasLogo(selectedTemplate) && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Info className="w-5 h-5" />
                  <span className="font-medium">Plantilla con Logo</span>
                </div>
                <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                  Esta plantilla requiere que subas un logo en el siguiente paso.
                </p>
              </div>
            )}

            {selectedTemplate && !templateHasLogo(selectedTemplate) && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Plantilla Solo Texto</span>
                </div>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Esta plantilla no requiere logo. Solo podrás personalizar colores y texto.
                </p>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Paso 2: Configuración y Personalización
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Personaliza los colores, logo, nombre de empresa y eslogan de tu plantilla.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Enterprise Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Información de Empresa
                </h4>
                
                <div>
                  <Label htmlFor="enterpriseName">Nombre de la Empresa</Label>
                  <Input
                    id="enterpriseName"
                    value={templateConfig.enterpriseName}
                    onChange={(e) => setTemplateConfig(prev => ({ ...prev, enterpriseName: e.target.value }))}
                    placeholder="Ej: Clínica Veterinaria San Marcos"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="enterpriseSlogan">Eslogan</Label>
                  <Input
                    id="enterpriseSlogan"
                    value={templateConfig.enterpriseSlogan}
                    onChange={(e) => setTemplateConfig(prev => ({ ...prev, enterpriseSlogan: e.target.value }))}
                    placeholder="Ej: Cuidamos a tu mejor amigo"
                    className="mt-1"
                  />
                </div>

                {/* Color Scheme */}
                <div>
                  <Label>Esquema de Colores</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      { name: 'blue', color: '#3b82f6', label: 'Azul' },
                      { name: 'green', color: '#10b981', label: 'Verde' },
                      { name: 'purple', color: '#8b5cf6', label: 'Morado' },
                      { name: 'red', color: '#ef4444', label: 'Rojo' },
                      { name: 'orange', color: '#f97316', label: 'Naranja' },
                      { name: 'indigo', color: '#6366f1', label: 'Índigo' },
                      { name: 'teal', color: '#14b8a6', label: 'Verde Azulado' },
                      { name: 'pink', color: '#ec4899', label: 'Rosa' }
                    ].map((colorOption) => (
                      <button
                        key={colorOption.name}
                        type="button"
                        className={`p-3 rounded-lg border-2 transition-all ${
                          templateConfig.colorScheme === colorOption.name
                            ? 'border-gray-900 dark:border-gray-100'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: colorOption.color }}
                        onClick={() => setTemplateConfig(prev => ({ ...prev, colorScheme: colorOption.name }))}
                        title={colorOption.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Logo Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  Configuración de Logo
                  {!templateHasLogo(selectedTemplate) && (
                    <Badge variant="secondary" className="text-xs">Opcional</Badge>
                  )}
                </h4>

                {templateHasLogo(selectedTemplate) && !logoUrl && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Logo Requerido</span>
                    </div>
                    <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                      Esta plantilla requiere un logo para continuar.
                    </p>
                  </div>
                )}

                {/* Logo Upload */}
                <div>
                  <Label>Subir Logo</Label>
                  <div 
                    className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleLogoDrop}
                  >
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Subiendo logo...</p>
                      </div>
                    ) : logoUrl ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={logoUrl} 
                          alt="Logo preview" 
                          className="w-16 h-16 object-contain mb-2 rounded border"
                        />
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">Logo subido exitosamente</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setLogoUrl("");
                            setLogoFile(null);
                          }}
                        >
                          Cambiar Logo
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <CloudUpload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoInputChange}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button variant="outline" size="sm" asChild>
                          <label htmlFor="logo-upload" className="cursor-pointer">
                            Seleccionar Archivo
                          </label>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Configuration Options - Only if logo is uploaded */}
                {logoUrl && (
                  <>
                    <div>
                      <Label>Posición del Logo</Label>
                      <Select 
                        value={templateConfig.logoPosition} 
                        onValueChange={(value) => setTemplateConfig(prev => ({ ...prev, logoPosition: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Izquierda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tamaño del Logo</Label>
                      <Select 
                        value={templateConfig.logoSize} 
                        onValueChange={(value) => setTemplateConfig(prev => ({ ...prev, logoSize: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeño</SelectItem>
                          <SelectItem value="medium">Mediano</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Opacidad: {templateConfig.logoOpacity}%</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={templateConfig.logoOpacity}
                          onChange={(e) => setTemplateConfig(prev => ({ ...prev, logoOpacity: parseInt(e.target.value) }))}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500">100%</span>
                      </div>
                    </div>

                    {logoFile?.type === 'image/png' && (
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="transparency"
                          checked={templateConfig.preserveLogoTransparency}
                          onCheckedChange={(checked) => setTemplateConfig(prev => ({ ...prev, preserveLogoTransparency: checked }))}
                        />
                        <Label htmlFor="transparency" className="text-sm">
                          Preservar transparencia (PNG)
                        </Label>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                Paso 3: Código QR (Opcional)
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Agrega un código QR a tus recibos para facilitar el acceso digital y verificación.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="qr-enabled"
                    checked={qrConfig.enabled}
                    onCheckedChange={(checked) => setQrConfig(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="qr-enabled" className="text-sm font-medium">
                    Incluir Código QR en los recibos
                  </Label>
                </div>

                {qrConfig.enabled && (
                  <>
                    <div>
                      <Label>Posición del QR</Label>
                      <Select 
                        value={qrConfig.position} 
                        onValueChange={(value) => setQrConfig(prev => ({ ...prev, position: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Izquierda del Pie</SelectItem>
                          <SelectItem value="right">Derecha del Pie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tamaño del QR</Label>
                      <Select 
                        value={qrConfig.size} 
                        onValueChange={(value) => setQrConfig(prev => ({ ...prev, size: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeño (60px)</SelectItem>
                          <SelectItem value="medium">Mediano (80px)</SelectItem>
                          <SelectItem value="large">Grande (100px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center">
                <div className="text-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  {qrConfig.enabled ? (
                    <div className="space-y-2">
                      <div className="w-20 h-20 mx-auto bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
                        <QrCode className="w-12 h-12 text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Vista previa del QR
                      </p>
                      <p className="text-xs text-gray-500">
                        Posición: {qrConfig.position} | Tamaño: {qrConfig.size}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <QrCode className="w-16 h-16 text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-500">
                        QR deshabilitado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 dark:text-blue-200 font-medium">Información del QR</p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    El código QR contendrá el número de recibo y permitirá la verificación digital del documento. 
                    Se posicionará automáticamente sin interferir con el contenido principal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Paso 4: Finalizar y Guardar
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Completa la información final y asigna la plantilla.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Nombre de la Plantilla *</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ej: Recibo Profesional San Marcos"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="templateDescription">Descripción</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe las características de esta plantilla..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Tipo Factura *</Label>
                  <Select value={facturaType} onValueChange={(value: "empresarial" | "clinica") => setFacturaType(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empresarial">Empresarial</SelectItem>
                      <SelectItem value="clinica">Clínica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {facturaType === "empresarial" && (
                  <div>
                    <Label htmlFor="companySelect">Empresa *</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona una empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {facturaType === "clinica" && (
                  <>
                    <div>
                      <Label htmlFor="companySelect">Empresa *</Label>
                      <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecciona una empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCompanyId && (
                      <div>
                        <Label htmlFor="tenantSelect">Clínica *</Label>
                        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecciona una clínica" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Resumen de Configuración</h4>
                
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Plantilla:</span>
                    <span className="font-medium">{preDesignedTemplates.find(t => t.id === selectedTemplate)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Empresa:</span>
                    <span className="font-medium">{templateConfig.enterpriseName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Eslogan:</span>
                    <span className="font-medium">{templateConfig.enterpriseSlogan}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Color:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: getColorValue(templateConfig.colorScheme) }}
                      />
                      <span className="font-medium capitalize">{templateConfig.colorScheme}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Logo:</span>
                    <span className="font-medium">{logoUrl ? 'Incluido' : 'No incluido'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Código QR:</span>
                    <span className="font-medium">{qrConfig.enabled ? 'Incluido' : 'No incluido'}</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setPreviewTemplate(generateTemplate());
                    setShowPreview(true);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa Final
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/superadmin" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gestión de Plantillas de Recibos
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Crea y gestiona plantillas de recibos personalizadas para tus clínicas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Asistente de Plantillas
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Gestionar Plantillas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-blue-600" />
                    Asistente de Creación de Plantillas
                  </CardTitle>
                  <Badge variant="outline">
                    Paso {wizardStep} de 4
                  </Badge>
                </div>
                <Progress value={(wizardStep / 4) * 100} className="w-full" />
              </CardHeader>
              <CardContent>
                {renderStepContent()}

                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                    disabled={wizardStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Anterior
                  </Button>

                  {wizardStep < 4 ? (
                    <Button
                      onClick={() => setWizardStep(prev => prev + 1)}
                      disabled={!canProceedToNextStep()}
                    >
                      Siguiente
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCreateTemplate}
                      disabled={!canProceedToNextStep() || uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Crear Plantilla
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Plantillas Existentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No hay plantillas
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Crea tu primera plantilla usando el asistente
                    </p>
                    <Button onClick={() => setActiveTab("wizard")}>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Crear Plantilla
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <Badge 
                              variant={template.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {template.isActive ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {template.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                              <span className="font-medium">{template.templateType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Versión:</span>
                              <span className="font-medium">{template.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Creada:</span>
                              <span className="font-medium">
                                {new Date(template.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPreviewTemplate(template.fileUrl);
                                setShowPreview(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const blob = new Blob([template.fileUrl], { type: 'text/html' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = template.fileName;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Vista Previa de Plantilla</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="mt-4">
              {previewTemplate && (
                <div 
                  className="border rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewTemplate }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}