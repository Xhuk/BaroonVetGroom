import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Image, 
  CheckCircle, 
  AlertCircle,
  Camera,
  FolderOpen
} from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MedicalAppointment, Pet, Client } from "@shared/schema";

export default function MobileUpload() {
  const params = useParams();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const appointmentType = params.type as string;
  const appointmentId = params.appointmentId as string;

  // Get appointment details
  const { data: appointment, isLoading } = useQuery<MedicalAppointment>({
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

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", {
        method: "POST",
      });
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload parameters:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    try {
      // Process each successful upload
      for (const file of result.successful) {
        const fileName = file.name;
        const fileUrl = file.uploadURL;
        
        // Update progress
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        
        // Save file reference to appointment
        await apiRequest(`/api/medical-appointments/${appointmentId}/documents`, {
          method: "POST",
          body: JSON.stringify({
            fileName,
            fileUrl,
            fileType: file.type,
            fileSize: file.size,
            documentType: getDocumentType(file.type, fileName),
          }),
        });

        setUploadedFiles(prev => [...prev, {
          name: fileName,
          url: fileUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date(),
        }]);
      }

      toast({
        title: "Archivos subidos",
        description: `Se subieron ${result.successful.length} archivo(s) correctamente`,
      });
    } catch (error) {
      console.error("Error saving file references:", error);
      toast({
        title: "Error",
        description: "Error al guardar la referencia del archivo",
        variant: "destructive",
      });
    }
  };

  const getDocumentType = (mimeType: string, fileName: string): string => {
    if (mimeType.startsWith("image/")) return "photo";
    if (mimeType === "application/pdf") return "lab_result";
    if (fileName.toLowerCase().includes("xray") || fileName.toLowerCase().includes("radiografia")) return "x_ray";
    return "other";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando información de la cita...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Cita no encontrada</h2>
            <p className="text-gray-600">
              No se pudo encontrar la información de esta cita médica.
            </p>
          </CardContent>
        </Card>
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
              <Camera className="w-6 h-6" />
              Subir Documentos Médicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div>
                <Badge variant="outline" className="mb-2">
                  {appointmentType === "medical" ? "Cita Médica" : "Consulta"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{pet?.name}</p>
                <p className="text-sm text-gray-600">{client?.name}</p>
                <p className="text-xs text-gray-500">
                  {appointment.visitDate ? new Date(appointment.visitDate).toLocaleDateString('es-ES') : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Imágenes y Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <ObjectUploader
                maxNumberOfFiles={10}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full"
              >
                <Upload className="w-5 h-5 mr-2" />
                Seleccionar Archivos
              </ObjectUploader>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              <p>Tipos aceptados: Imágenes, PDF, DOC</p>
              <p>Tamaño máximo: 10MB por archivo</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Progreso de Subida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="truncate flex-1">{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Archivos Subidos ({uploadedFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.uploadedAt.toLocaleTimeString('es-ES')}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="text-center py-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Instrucciones:</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Sube rayos X, resultados de laboratorio, fotografías</p>
                <p>• Los archivos se asociarán automáticamente a esta cita</p>
                <p>• Puedes subir múltiples archivos a la vez</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}