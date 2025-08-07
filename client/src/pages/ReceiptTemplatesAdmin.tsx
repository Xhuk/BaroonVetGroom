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
  Loader2
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
  const [uploadMode, setUploadMode] = useState<"company" | "tenant">("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
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
      return apiRequest('/api/admin/receipt-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      });
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
      return apiRequest(`/api/admin/receipt-templates/${templateId}`, {
        method: 'DELETE',
      });
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

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setSelectedFile(null);
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
      const uploadResponse = await apiRequest('/api/admin/receipt-templates/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName: selectedFile.name }),
      });

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
              Gestiona las plantillas ZIP para recibos por empresa o sitio
            </p>
          </div>

          {/* Upload Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="w-5 h-5" />
                <span>Subir Nueva Plantilla</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Mode Selection */}
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

                {/* Company Selection */}
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

              {/* Tenant Selection (only if tenant mode) */}
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

              {/* Template Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Plantilla</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ej: Recibo Veterinario Estándar"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Archivo ZIP</Label>
                  <Input
                    id="file-input"
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe el contenido y uso de esta plantilla..."
                  rows={3}
                />
              </div>

              {/* Upload Button */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {selectedFile && (
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                    </div>
                  )}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={resetForm}>
                    Limpiar
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploading || !selectedFile || !templateName}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Plantilla
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates List */}
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
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay plantillas disponibles</p>
                  <p className="text-sm">Sube tu primera plantilla para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="font-medium text-lg">{template.name}</h3>
                            {template.isActive ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          
                          {template.description && (
                            <p className="text-gray-600 text-sm">{template.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>Archivo: {template.fileName}</span>
                            <span>Tamaño: {formatFileSize(template.fileSize)}</span>
                            <span>Versión: {template.version}</span>
                            <span>Tipo: {template.tenantId ? 'Sitio específico' : 'Global de empresa'}</span>
                          </div>
                          
                          <div className="text-xs text-gray-400">
                            Creado: {new Date(template.createdAt).toLocaleDateString('es-MX')}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(template)}
                            data-testid={`button-download-${template.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}