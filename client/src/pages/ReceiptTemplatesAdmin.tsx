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
  CloudUpload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  const [templateConfig, setTemplateConfig] = useState({
    headerStyle: "professional",
    colorScheme: "blue",
    includeSignature: true,
    logoPosition: "left"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const preDesignedTemplates = [
    {
      id: "veterinary-professional",
      name: "Veterinario Profesional",
      description: "Plantilla elegante para clínicas veterinarias con espacios para servicios múltiples",
      preview: "/assets/template-preview-1.png",
      features: ["Logo personalizable", "Tabla de servicios", "Cálculos automáticos", "Firma digital"]
    },
    {
      id: "minimalist-clinic",
      name: "Clínica Minimalista",
      description: "Diseño limpio y moderno para consultorios pequeños",
      preview: "/assets/template-preview-2.png",
      features: ["Diseño simple", "Enfoque en servicios", "Fácil lectura", "Compacto"]
    },
    {
      id: "detailed-invoice",
      name: "Factura Detallada",
      description: "Plantilla completa con desglose de impuestos y términos",
      preview: "/assets/template-preview-3.png",
      features: ["Desglose fiscal", "Términos y condiciones", "Múltiples mascotas", "Historial médico"]
    }
  ];

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setSelectedFile(null);
    setSelectedTemplate("");
    setWizardStep(1);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos ZIP",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Error",
          description: "El archivo es demasiado grande (máximo 50MB)",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace('.zip', ''));
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect({ target: { files } } as any);
    }
  };

  const generatePreDesignedTemplate = async (templateId: string) => {
    setUploading(true);
    try {
      // Generate template based on configuration
      const templateData = {
        templateId,
        config: templateConfig,
        name: templateName || `Plantilla ${preDesignedTemplates.find(t => t.id === templateId)?.name}`,
        description: templateDescription,
        companyId: uploadMode === "company" ? selectedCompanyId : undefined,
        tenantId: uploadMode === "tenant" ? selectedTenantId : undefined,
      };
      
      await apiRequest('/api/admin/receipt-templates/generate', 'POST', templateData);
      
      toast({
        title: "Éxito",
        description: "Plantilla generada y guardada correctamente",
      });
      
      setWizardStep(1);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/receipt-templates'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al generar la plantilla",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName) {
      toast({
        title: "Error",
        description: "Selecciona un archivo y proporciona un nombre",
        variant: "destructive",
      });
      return;
    }

    if (uploadMode === "company" && !selectedCompanyId) {
      toast({
        title: "Error",
        description: "Selecciona una empresa",
        variant: "destructive",
      });
      return;
    }

    if (uploadMode === "tenant" && !selectedTenantId) {
      toast({
        title: "Error",
        description: "Selecciona un sitio",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get upload URL
      const uploadResponse = await apiRequest('/api/admin/receipt-templates/upload-url', 'POST', { fileName: selectedFile.name }) as { uploadURL: string };

      // Upload file to object storage
      const uploadResult = await fetch(uploadResponse.uploadURL, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': 'application/zip',
        },
      });

      if (!uploadResult.ok) {
        throw new Error('Error al subir el archivo');
      }

      // Create template record
      const templateData = {
        name: templateName,
        description: templateDescription,
        templateType: 'receipt',
        fileUrl: uploadResponse.uploadURL.split('?')[0], // Remove query parameters
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        version: '1.0',
        isActive: true,
        companyId: uploadMode === "company" ? selectedCompanyId : undefined,
        tenantId: uploadMode === "tenant" ? selectedTenantId : undefined,
      };

      await createTemplateMutation.mutateAsync(templateData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir la plantilla",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (template: ReceiptTemplate) => {
    try {
      const response = await fetch(`/api/admin/receipt-templates/${template.id}/download`);
      if (!response.ok) throw new Error('Error al descargar');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar la plantilla",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const nextStep = () => {
    if (wizardStep < 4) setWizardStep(wizardStep + 1);
  };

  const prevStep = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  const getStepProgress = () => (wizardStep / 4) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Administración de Plantillas de Recibo
            </h1>
            <p className="text-gray-600">
              Crea plantillas personalizadas con nuestro asistente visual o sube tus propios archivos ZIP
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wizard" className="flex items-center space-x-2">
                <Wand2 className="w-4 h-4" />
                <span>Asistente Visual</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <CloudUpload className="w-4 h-4" />
                <span>Subida Rápida</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Gestionar Plantillas</span>
              </TabsTrigger>
            </TabsList>

            {/* Visual Wizard Tab */}
            <TabsContent value="wizard">
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-blue-800">
                      <Wand2 className="w-6 h-6" />
                      <span>Asistente de Creación de Plantillas</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      Paso {wizardStep} de 4
                    </Badge>
                  </div>
                  <Progress value={getStepProgress()} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Step 1: Template Selection */}
                  {wizardStep === 1 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Selecciona una Plantilla Base
                        </h3>
                        <p className="text-gray-600">
                          Elige entre nuestras plantillas prediseñadas para veterinarias
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {preDesignedTemplates.map((template) => (
                          <div
                            key={template.id}
                            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                              selectedTemplate === template.id
                                ? 'border-blue-500 bg-blue-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                            }`}
                            onClick={() => setSelectedTemplate(template.id)}
                            data-testid={`template-${template.id}`}
                          >
                            {selectedTemplate === template.id && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                              </div>
                            )}
                            
                            <div className="mb-4">
                              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                                <FileImage className="w-12 h-12 text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">Vista Previa</span>
                              </div>
                            </div>
                            
                            <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            
                            <div className="space-y-1">
                              {template.features.map((feature, index) => (
                                <div key={index} className="flex items-center text-xs text-gray-500">
                                  <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-end">
                        <Button 
                          onClick={nextStep} 
                          disabled={!selectedTemplate}
                          className="flex items-center space-x-2"
                          data-testid="button-next-step"
                        >
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Template Configuration */}
                  {wizardStep === 2 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Personaliza tu Plantilla
                        </h3>
                        <p className="text-gray-600">
                          Configura los colores, estilos y elementos de tu recibo
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label>Esquema de Colores</Label>
                            <Select value={templateConfig.colorScheme} onValueChange={(value) => 
                              setTemplateConfig({...templateConfig, colorScheme: value})
                            }>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="blue">Azul Profesional</SelectItem>
                                <SelectItem value="green">Verde Veterinario</SelectItem>
                                <SelectItem value="purple">Morado Elegante</SelectItem>
                                <SelectItem value="gray">Gris Corporativo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Estilo de Encabezado</Label>
                            <Select value={templateConfig.headerStyle} onValueChange={(value) => 
                              setTemplateConfig({...templateConfig, headerStyle: value})
                            }>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">Profesional</SelectItem>
                                <SelectItem value="modern">Moderno</SelectItem>
                                <SelectItem value="classic">Clásico</SelectItem>
                                <SelectItem value="minimal">Minimalista</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Posición del Logo</Label>
                            <Select value={templateConfig.logoPosition} onValueChange={(value) => 
                              setTemplateConfig({...templateConfig, logoPosition: value})
                            }>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Izquierda</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="right">Derecha</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="includeSignature" 
                              checked={templateConfig.includeSignature}
                              onChange={(e) => setTemplateConfig({...templateConfig, includeSignature: e.target.checked})}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="includeSignature">Incluir espacio para firma</Label>
                          </div>
                          
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                              <Eye className="w-4 h-4 mr-2" />
                              Vista Previa
                            </h4>
                            <div className="w-full h-48 bg-white border rounded-lg flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm">Vista previa de la plantilla</p>
                                <p className="text-xs">Esquema: {templateConfig.colorScheme}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={prevStep} className="flex items-center space-x-2">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </Button>
                        <Button onClick={nextStep} className="flex items-center space-x-2">
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Scope Selection */}
                  {wizardStep === 3 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Define el Alcance de la Plantilla
                        </h3>
                        <p className="text-gray-600">
                          Decide si será para toda la empresa o para sitios específicos
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Plantilla</Label>
                          <Select value={uploadMode} onValueChange={(value: "company" | "tenant") => setUploadMode(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-4 h-4" />
                                  <span>Global por Empresa</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="tenant">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>Específico por Sitio</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger>
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
                      </div>

                      {uploadMode === "tenant" && (
                        <div className="space-y-2">
                          <Label>Sitio</Label>
                          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un sitio" />
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
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={prevStep} className="flex items-center space-x-2">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </Button>
                        <Button onClick={nextStep} className="flex items-center space-x-2">
                          <span>Continuar</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Final Details */}
                  {wizardStep === 4 && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Detalles Finales
                        </h3>
                        <p className="text-gray-600">
                          Proporciona un nombre y descripción para tu plantilla
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre de la Plantilla</Label>
                          <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Ej: Recibo Clínica Principal"
                            data-testid="input-template-name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descripción (Opcional)</Label>
                          <Textarea
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                            placeholder="Describe el propósito de esta plantilla..."
                            rows={3}
                            data-testid="textarea-template-description"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resumen de la Plantilla
                        </h4>
                        <div className="text-sm text-green-700 space-y-1">
                          <p><strong>Plantilla:</strong> {preDesignedTemplates.find(t => t.id === selectedTemplate)?.name}</p>
                          <p><strong>Esquema de colores:</strong> {templateConfig.colorScheme}</p>
                          <p><strong>Estilo:</strong> {templateConfig.headerStyle}</p>
                          <p><strong>Alcance:</strong> {uploadMode === "company" ? "Toda la empresa" : "Sitio específico"}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={prevStep} className="flex items-center space-x-2">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </Button>
                        <Button 
                          onClick={() => generatePreDesignedTemplate(selectedTemplate)} 
                          disabled={uploading || !templateName}
                          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                          data-testid="button-generate-template"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          <span>Generar Plantilla</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Quick Upload Tab */}
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CloudUpload className="w-5 h-5" />
                    <span>Subida Rápida de Plantilla ZIP</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Drag and Drop Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    data-testid="drag-drop-area"
                  >
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <CloudUpload className={`w-8 h-8 ${dragActive ? 'text-blue-600' : 'text-blue-500'}`} />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {dragActive ? 'Suelta el archivo ZIP aquí' : 'Arrastra tu archivo ZIP aquí'}
                        </h3>
                        <p className="text-gray-600">
                          o{' '}
                          <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                            examina tu computadora
                            <input
                              id="file-input"
                              type="file"
                              accept=".zip"
                              onChange={handleFileSelect}
                              className="hidden"
                              data-testid="input-file-upload"
                            />
                          </label>
                        </p>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        <p>Solo archivos ZIP • Máximo 50MB</p>
                        {selectedFile && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded inline-block">
                            <span className="text-green-700 flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {selectedFile.name} ({formatFileSize(selectedFile.size)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Plantilla</Label>
                        <Select value={uploadMode} onValueChange={(value: "company" | "tenant") => setUploadMode(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">
                              <div className="flex items-center space-x-2">
                                <Building className="w-4 h-4" />
                                <span>Global por Empresa</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="tenant">
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>Específico por Sitio</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Empresa</Label>
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                          <SelectTrigger>
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

                      {uploadMode === "tenant" && (
                        <div className="space-y-2">
                          <Label>Sitio</Label>
                          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un sitio" />
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
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nombre de la Plantilla</Label>
                        <Input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Ej: Recibo Clínica Principal"
                          data-testid="input-template-name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Descripción (Opcional)</Label>
                        <Textarea
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          placeholder="Describe el propósito de esta plantilla..."
                          rows={3}
                          data-testid="textarea-template-description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploading || !selectedFile || !templateName}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                      data-testid="button-upload-template"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>{uploading ? 'Subiendo...' : 'Subir Plantilla ZIP'}</span>
                    </Button>
                  </div>
                  
                  {/* Technical Guide Accordion */}
                  <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <Info className="w-5 h-5 text-amber-600" />
                      <h3 className="font-medium text-amber-800">Guía Técnica para Archivos ZIP</h3>
                    </div>
                    <div className="text-sm text-amber-700 space-y-2">
                      <p><strong>Estructura requerida:</strong> recibo.html, styles.css, config.json</p>
                      <p><strong>Carpetas opcionales:</strong> assets/ (logos, imágenes), fonts/ (tipografías)</p>
                      <p><strong>Variables del sistema:</strong> Use {'{'}{'{'} empresa_nombre {'}'}{'}' para datos dinámicos</p>
                      <p><strong>Tamaño máximo:</strong> 50MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Template Management Tab */}
            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Plantillas Existentes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      <span className="ml-2 text-gray-600">Cargando plantillas...</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay plantillas disponibles</p>
                      <p className="text-sm">Crea tu primera plantilla con el Asistente Visual</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          data-testid={`template-card-${template.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                <Badge variant={template.isActive ? "default" : "secondary"}>
                                  {template.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                                {template.companyId && (
                                  <Badge variant="outline" className="text-blue-600">
                                    <Building className="w-3 h-3 mr-1" />
                                    Empresa
                                  </Badge>
                                )}
                                {template.tenantId && (
                                  <Badge variant="outline" className="text-green-600">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    Sitio
                                  </Badge>
                                )}
                              </div>
                              
                              {template.description && (
                                <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                              )}
                              
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>Archivo: {template.fileName}</span>
                                <span>Tamaño: {formatFileSize(template.fileSize)}</span>
                                <span>Versión: {template.version}</span>
                                <span>Subido: {new Date(template.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(template)}
                                className="flex items-center space-x-1"
                                data-testid={`button-download-${template.id}`}
                              >
                                <Download className="w-4 h-4" />
                                <span>Descargar</span>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTemplateMutation.mutate(template.id)}
                                disabled={deleteTemplateMutation.isPending}
                                className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-${template.id}`}
                              >
                                {deleteTemplateMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                <span>Eliminar</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}