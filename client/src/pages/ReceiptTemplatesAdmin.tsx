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
  Percent
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
  const [uploadMode, setUploadMode] = useState<"company" | "tenant">("company");
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
  
  // Only customizable options
  const [templateConfig, setTemplateConfig] = useState({
    colorScheme: "blue",
    logoPosition: "left",
    logoOpacity: 100,
    logoSize: "medium",
    preserveLogoTransparency: true
  });

  // Hardcoded template data - not customizable
  const hardcodedData = {
    empresaNombre: "Clínica Veterinaria San Marcos",
    empresaEslogan: "Cuidamos a tu mejor amigo",
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

  // Fetch companies for selection
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
  });

  // Fetch tenants for selected company
  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ['/api/tenants', selectedCompanyId],
    enabled: !!selectedCompanyId && uploadMode === "tenant",
  });

  // Fetch receipt templates
  const { data: templates = [], isLoading } = useQuery<ReceiptTemplate[]>({
    queryKey: ['/api/admin/receipt-templates', { 
      companyId: uploadMode === "company" ? selectedCompanyId : undefined,
      tenantId: uploadMode === "tenant" ? selectedTenantId : undefined 
    }],
    enabled: uploadMode === "company" ? !!selectedCompanyId : !!selectedTenantId,
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
        description: "Plantilla de recibo subida correctamente",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al subir la plantilla",
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

  // Check if selected template has logo placeholders
  const templateHasLogo = (templateId: string) => {
    const template = preDesignedTemplates.find(t => t.id === templateId);
    if (!template?.htmlPreview) return false;
    
    // Check if template contains logo-related variables or placeholders
    return template.htmlPreview.includes('logoUrl') || 
           template.htmlPreview.includes('${logoUrl') ||
           template.htmlPreview.includes('logo') ||
           template.features?.some(feature => feature.toLowerCase().includes('logo'));
  };

  const selectedTemplateHasLogo = selectedTemplate ? templateHasLogo(selectedTemplate) : false;

  const preDesignedTemplates = [
    {
      id: "header-professional",
      name: "Estilo Profesional",
      description: "Encabezado corporativo con logo personalizable y gradiente elegante",
      preview: "/assets/template-preview-1.png",
      features: ["Logo personalizable", "Gradiente dinámico", "Información estructurada", "Aspecto corporativo"],
      htmlPreview: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid ${getColorValue(templateConfig.colorScheme)}; border-radius: 8px; overflow: hidden; background: white;">
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
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${hardcodedData.empresaNombre}</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${hardcodedData.empresaEslogan}</p>
              </div>
              <div style="text-align: right;">
                <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 4px; margin-bottom: 8px;">
                  <span style="font-size: 18px; font-weight: bold;">RECIBO</span>
                </div>
                <p style="margin: 0; font-size: 14px;"># ${hardcodedData.numeroRecibo}</p>
              </div>` : `
              <div style="text-align: center; flex: 1;">
                <h1 style="margin: 0; font-size: 20px; font-weight: bold;">${hardcodedData.empresaNombre}</h1>
                <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">${hardcodedData.empresaEslogan}</p>
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

            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
              <p style="margin: 4px 0; font-size: 13px;">${hardcodedData.empresaWeb} | ${hardcodedData.empresaTelefono}</p>
              <p style="margin: 4px 0; font-size: 12px;">${hardcodedData.empresaDireccion}</p>
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
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid ${getColorValue(templateConfig.colorScheme)}; border-radius: 8px; overflow: hidden; background: white;">
          <!-- Simple Header without Logo -->
          <div style="background: ${getColorValue(templateConfig.colorScheme)}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${hardcodedData.empresaNombre}</h1>
            <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">${hardcodedData.empresaEslogan}</p>
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

            <!-- Footer -->
            <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
              <p style="margin: 4px 0; font-size: 13px;">${hardcodedData.empresaWeb} | ${hardcodedData.empresaTelefono}</p>
              <p style="margin: 4px 0; font-size: 12px;">${hardcodedData.empresaDireccion}</p>
            </div>
          </div>
        </div>
      `
    }
  ];

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
      const url = new URL(response.uploadURL);
      const logoPath = url.pathname;
      setLogoUrl(`/objects${logoPath.replace(/^\/[^\/]+/, '')}`);
      setLogoFile(file);

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
      preserveLogoTransparency: true
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
          hardcodedData: hardcodedData,
          logo: logoUrl
        },
        htmlContent: generateTemplate(),
        companyId: uploadMode === "company" ? selectedCompanyId : undefined,
        tenantId: uploadMode === "tenant" ? selectedTenantId : undefined,
      };

      await createTemplateMutation.mutateAsync(newTemplateData);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', templateName);
      formData.append('description', templateDescription);
      formData.append('templateType', 'upload');
      
      if (uploadMode === "company") {
        formData.append('companyId', selectedCompanyId);
      } else {
        formData.append('tenantId', selectedTenantId);
      }

      await createTemplateMutation.mutateAsync(formData);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = () => {
    const template = generateTemplate();
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plantillas de Recibos</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona y personaliza plantillas para recibos veterinarios
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wizard">
              <Wand2 className="w-4 h-4 mr-2" />
              Asistente Simplificado
            </TabsTrigger>
            <TabsTrigger value="manage">
              <FileText className="w-4 h-4 mr-2" />
              Gestionar Plantillas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wizard">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      <span>Asistente de Plantillas Simplificado</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Crea plantillas profesionales con solo 3 opciones: color, logo y posición
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      Paso {wizardStep} de 3
                    </div>
                    <Progress value={(wizardStep / 3) * 100} className="w-32" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Configuración de Destino</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Tipo de Subida</Label>
                          <Select value={uploadMode} onValueChange={(value: "company" | "tenant") => setUploadMode(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">Nivel Empresa</SelectItem>
                              <SelectItem value="tenant">Nivel Clínica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Empresa</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar empresa" />
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

                        {uploadMode === "tenant" && (
                          <div>
                            <Label>Clínica</Label>
                            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar clínica" />
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
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-4">Información de la Plantilla</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label>Nombre de la Plantilla</Label>
                          <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Ej: Recibo Estándar Veterinaria"
                            data-testid="input-template-name"
                          />
                        </div>
                        <div>
                          <Label>Descripción (Opcional)</Label>
                          <Textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder="Descripción de la plantilla"
                            rows={2}
                            data-testid="textarea-template-description"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => setWizardStep(2)}
                        disabled={!selectedCompanyId || (uploadMode === "tenant" && !selectedTenantId) || !templateName.trim()}
                        data-testid="button-next-step"
                      >
                        Siguiente
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Personalización Simple</h3>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Solo 3 Opciones Personalizables
                      </Badge>
                    </div>

                    {/* Essential Configuration - Only Color, Logo Position, and Logo Upload */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                              <Palette className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Esquema de Colores</CardTitle>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecciona la paleta de colores para tu recibo</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { name: "blue", color: "bg-blue-500", label: "Azul" },
                              { name: "green", color: "bg-green-500", label: "Verde" },
                              { name: "purple", color: "bg-purple-500", label: "Morado" },
                              { name: "red", color: "bg-red-500", label: "Rojo" },
                              { name: "orange", color: "bg-orange-500", label: "Naranja" },
                              { name: "indigo", color: "bg-indigo-500", label: "Índigo" },
                              { name: "teal", color: "bg-teal-500", label: "Verde Azul" },
                              { name: "pink", color: "bg-pink-500", label: "Rosa" }
                            ].map((colorOption) => (
                              <button
                                key={colorOption.name}
                                type="button"
                                onClick={() => setTemplateConfig(prev => ({ ...prev, colorScheme: colorOption.name }))}
                                className={`group relative w-full h-16 rounded-lg ${colorOption.color} transition-all duration-200 hover:scale-105 ${
                                  templateConfig.colorScheme === colorOption.name
                                    ? 'ring-4 ring-blue-200 dark:ring-blue-400 shadow-lg'
                                    : 'hover:shadow-md'
                                }`}
                              >
                                <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                {templateConfig.colorScheme === colorOption.name && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{colorOption.label}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader className="pb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                              <Layout className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Posición del Logo</CardTitle>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define dónde aparecerá tu logo en el recibo</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { value: "left", label: "Izquierda", icon: "←" },
                              { value: "center", label: "Centro", icon: "↔" }
                            ].map((position) => (
                              <button
                                key={position.value}
                                type="button"
                                onClick={() => setTemplateConfig(prev => ({ ...prev, logoPosition: position.value }))}
                                className={`group relative w-full h-20 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                                  templateConfig.logoPosition === position.value
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg'
                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center h-full space-y-2">
                                  <div className="text-2xl font-bold text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                                    {position.icon}
                                  </div>
                                  <span className={`text-sm font-medium ${
                                    templateConfig.logoPosition === position.value
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {position.label}
                                  </span>
                                </div>
                                {templateConfig.logoPosition === position.value && (
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle className="w-5 h-5 text-blue-500" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Logo Upload Section - Only Customizable Option */}
                    <Card className="border-slate-200 dark:border-slate-700">
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <FileImage className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Logo de la Empresa</CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube el logo de tu veterinaria con soporte para transparencias. El logo se ajustará automáticamente al tamaño de la plantilla.</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Logo Required Warning - Only show for templates that have logo placeholders */}
                          {selectedTemplateHasLogo && !logoUrl && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <div>
                                  <p className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                                    <strong>Logo Requerido:</strong> Esta plantilla requiere un logo para continuar.
                                  </p>
                                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                                    Sin el logo, solo podrás seleccionar el esquema de colores. Las demás opciones se habilitarán una vez que subas tu logo.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Info for templates without logo */}
                          {selectedTemplate && !selectedTemplateHasLogo && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <div>
                                  <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">
                                    <strong>Plantilla Sin Logo:</strong> Esta plantilla no incluye espacios para logo.
                                  </p>
                                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                                    Puedes personalizar solo el esquema de colores para esta plantilla.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Logo Upload Area */}
                          <div className="space-y-4">
                            <div
                              onDrop={handleLogoDrop}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragActive(true);
                              }}
                              onDragLeave={() => setDragActive(false)}
                              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                                dragActive
                                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 scale-102'
                                  : selectedTemplateHasLogo && !logoUrl 
                                    ? 'border-amber-300 dark:border-amber-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                              }`}
                              onClick={() => document.getElementById('logo-upload')?.click()}
                            >
                              <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoInputChange}
                                className="hidden"
                              />
                              
                              {logoUrl ? (
                                <div className="space-y-4">
                                  <div className="relative inline-block">
                                    <img
                                      src={logoUrl}
                                      alt="Logo preview"
                                      className={`w-20 h-20 object-${templateConfig.preserveLogoTransparency ? 'contain' : 'cover'} rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm`}
                                      style={{ opacity: templateConfig.logoOpacity / 100 }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLogoUrl("");
                                        setLogoFile(null);
                                      }}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center justify-center space-x-2">
                                      <CheckCircle className="w-4 h-4" />
                                      <span>Logo cargado correctamente</span>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Haz clic para cambiar el logo
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center mx-auto">
                                    <CloudUpload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                      Arrastra y suelta tu logo aquí
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      o haz clic para seleccionar un archivo
                                    </p>
                                    <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
                                      <p>• Formatos soportados: PNG, JPG, SVG</p>
                                      <p>• Tamaño máximo: 5MB</p>
                                      <p>• Recomendado: PNG con transparencia</p>
                                      <p>• El logo se ajustará automáticamente al tamaño de la plantilla</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {uploadingLogo && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                  <div className="text-center space-y-3">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subiendo logo...</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Simplified Logo Configuration - Only Opacity Control */}
                          {logoUrl && (
                            <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                              {/* Logo Opacity */}
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                                  <span className="flex items-center space-x-2">
                                    <Percent className="w-4 h-4" />
                                    <span>Opacidad del Logo</span>
                                  </span>
                                  <span className="text-blue-600 dark:text-blue-400 font-mono">{templateConfig.logoOpacity}%</span>
                                </Label>
                                <div className="space-y-3">
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={templateConfig.logoOpacity}
                                    onChange={(e) => setTemplateConfig(prev => ({ ...prev, logoOpacity: parseInt(e.target.value) }))}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <span>10%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Transparency Preservation - Auto-enabled for PNG */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <div className="space-y-1">
                                    <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">Preservar Transparencia</Label>
                                    <p className="text-xs text-blue-700 dark:text-blue-300">Mantiene los fondos transparentes del PNG</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setTemplateConfig(prev => ({ ...prev, preserveLogoTransparency: !prev.preserveLogoTransparency }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                      templateConfig.preserveLogoTransparency ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                        templateConfig.preserveLogoTransparency ? 'translate-x-6' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Information Notice - All content is hardcoded */}
                    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                            <Info className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-100">Contenido Predeterminado</CardTitle>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Toda la información del recibo está preconfigurada para garantizar un diseño profesional</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Company Info Preview */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">Información de la Empresa</h4>
                            <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                              <div><strong>Nombre:</strong> {hardcodedData.empresaNombre}</div>
                              <div><strong>Eslogan:</strong> {hardcodedData.empresaEslogan}</div>
                              <div><strong>Teléfono:</strong> {hardcodedData.empresaTelefono}</div>
                              <div><strong>Web:</strong> {hardcodedData.empresaWeb}</div>
                              <div><strong>Dirección:</strong> {hardcodedData.empresaDireccion}</div>
                            </div>
                          </div>

                          {/* Client & Service Info Preview */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">Información del Cliente y Servicios</h4>
                            <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                              <div><strong>Cliente:</strong> {hardcodedData.clienteNombre}</div>
                              <div><strong>Mascota:</strong> {hardcodedData.mascotaNombre}</div>
                              <div><strong>Veterinario:</strong> {hardcodedData.veterinario}</div>
                              <div><strong>Servicios:</strong> {hardcodedData.articulos.length} servicios veterinarios</div>
                              <div><strong>Total:</strong> <span className="font-bold">{hardcodedData.total}</span></div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Nota:</strong> Solo puedes personalizar el esquema de colores, la posición del logo, y subir tu propio logo con transparencia. 
                            El resto del contenido está optimizado para crear recibos profesionales de manera rápida y consistente.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between">
                      <Button
                        onClick={() => setWizardStep(1)}
                        variant="outline"
                        data-testid="button-previous-step"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Anterior
                      </Button>
                      <Button
                        onClick={() => setWizardStep(3)}
                        disabled={selectedTemplateHasLogo && !logoUrl}
                        className={`${selectedTemplateHasLogo && !logoUrl ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        data-testid="button-next-step"
                      >
                        Seleccionar Plantilla
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Seleccionar Plantilla Base</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Elige una plantilla base que se personalizará con tus configuraciones
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                      {preDesignedTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedTemplate === template.id
                              ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50 dark:bg-blue-950/20'
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start space-x-6">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-4">
                                  <div>
                                    <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                      {template.name}
                                    </h4>
                                    <p className="text-gray-600 dark:text-gray-400">
                                      {template.description}
                                    </p>
                                  </div>
                                  {selectedTemplate === template.id && (
                                    <CheckCircle className="w-8 h-8 text-blue-500" />
                                  )}
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {template.features.map((feature, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {feature}
                                    </Badge>
                                  ))}
                                </div>

                                <div className="flex space-x-3">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTemplate(template.id);
                                      handlePreview();
                                    }}
                                    className="flex items-center space-x-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>Vista Previa</span>
                                  </Button>
                                </div>
                              </div>

                              <div className="w-64 h-48 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                  <FileText className="w-12 h-12 mx-auto mb-2" />
                                  <p className="text-sm">Vista previa dinámica</p>
                                  <p className="text-xs">Se actualiza con tus cambios</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex justify-between">
                      <Button
                        onClick={() => setWizardStep(2)}
                        variant="outline"
                        data-testid="button-previous-step"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Anterior
                      </Button>
                      <div className="space-x-3">
                        <Button
                          onClick={handlePreview}
                          variant="outline"
                          disabled={!selectedTemplate}
                          data-testid="button-preview"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Vista Previa
                        </Button>
                        <Button
                          onClick={handleCreateTemplate}
                          disabled={!selectedTemplate || uploading}
                          data-testid="button-create-template"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Crear Plantilla
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage">
            <Card>
              <CardHeader>
                <CardTitle>Plantillas Existentes</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestiona las plantillas existentes para{" "}
                  {uploadMode === "company" ? "nivel empresa" : "nivel clínica"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <Select value={uploadMode} onValueChange={(value: "company" | "tenant") => setUploadMode(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Nivel Empresa</SelectItem>
                        <SelectItem value="tenant">Nivel Clínica</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Seleccionar empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {uploadMode === "tenant" && (
                      <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Seleccionar clínica" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      <span>Cargando plantillas...</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay plantillas disponibles</p>
                      <p className="text-sm">Crea tu primera plantilla usando el asistente</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map((template) => (
                        <Card key={template.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                  {template.name}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {template.description || "Sin descripción"}
                                </p>
                              </div>
                              <Badge
                                variant={template.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {template.isActive ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                              <div>Tipo: {template.templateType}</div>
                              <div>Versión: {template.version}</div>
                              <div>
                                Creada: {new Date(template.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (template.metadata?.htmlContent) {
                                    setPreviewTemplate(template.metadata.htmlContent);
                                    setShowPreview(true);
                                  }
                                }}
                                className="flex-1"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (template.fileUrl) {
                                    window.open(template.fileUrl, '_blank');
                                  }
                                }}
                                className="flex-1"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Descargar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>Vista Previa de la Plantilla</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="w-full min-h-full flex items-start justify-center p-4">
              {selectedTemplate && (() => {
                const template = preDesignedTemplates.find(t => t.id === selectedTemplate);
                if (!template) return null;
                
                // Create dynamic preview HTML with current config
                let previewHtml = template.htmlPreview;
                
                return <div dangerouslySetInnerHTML={{ __html: previewHtml }} />;
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}