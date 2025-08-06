import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, FileText, Heart, Clock, Eye, Share2, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface TempLinkData {
  valid: boolean;
  error?: string;
  link?: {
    type: string;
    resourceId: string;
    tenantId: string;
    metadata: any;
    accessCount: number;
    maxAccess: number | null;
    expiresAt: string;
  };
  data?: any; // Pet data, file data, etc.
}

export default function TempLinkHandler() {
  const params = useParams();
  const token = params.token;
  const [uploadComplete, setUploadComplete] = useState(false);

  const { data: linkData, isLoading, error } = useQuery({
    queryKey: ['/api/temp-links', token],
    enabled: !!token,
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadUrl = result.successful[0].uploadURL;
      
      // Update the temp link with file information
      await fetch(`/api/temp-links/${token}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: uploadUrl }),
      });
      
      setUploadComplete(true);
    }
  };

  const handleDownload = async () => {
    const typedLinkData = linkData as TempLinkData;
    if (typedLinkData?.link?.metadata?.fileUrl) {
      window.open(typedLinkData.link.metadata.fileUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md dark:bg-gray-800">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Verificando enlace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typedLinkData = linkData as TempLinkData;
  
  if (error || !typedLinkData?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Enlace No Válido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 dark:border-red-800">
              <AlertDescription className="dark:text-gray-300">
                {typedLinkData?.error || "El enlace no existe, ha expirado o ha sido revocado."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const link = typedLinkData.link!;
  const isExpired = new Date(link.expiresAt) < new Date();
  const accessLimitReached = link.maxAccess && link.accessCount >= link.maxAccess;

  // Pet QR Code View
  if (link.type === 'pet_qr') {
    const pet = typedLinkData.data?.pet;
    const client = typedLinkData.data?.client;
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                  <Heart className="w-5 h-5 text-red-500" />
                  Información de Mascota
                </CardTitle>
                <Badge variant="secondary" className="dark:bg-gray-700 dark:text-gray-200">
                  Acceso #{link.accessCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pet && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre</label>
                      <p className="text-lg font-semibold dark:text-gray-100">{pet.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Especie</label>
                      <p className="dark:text-gray-200">{pet.species}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Raza</label>
                      <p className="dark:text-gray-200">{pet.breed || 'No especificada'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Peso</label>
                      <p className="dark:text-gray-200">{pet.weight ? `${pet.weight} kg` : 'No registrado'}</p>
                    </div>
                  </div>
                  
                  {client && (
                    <div className="border-t pt-4 dark:border-gray-700">
                      <h3 className="font-semibold mb-2 dark:text-gray-100">Información del Propietario</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p className="dark:text-gray-200"><strong>Nombre:</strong> {client.name}</p>
                        <p className="dark:text-gray-200"><strong>Teléfono:</strong> {client.phone}</p>
                        {client.email && <p className="dark:text-gray-200"><strong>Email:</strong> {client.email}</p>}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Expira: {new Date(link.expiresAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // File Share Upload View
  if (link.type === 'file_share' && !link.metadata?.fileUrl) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Upload className="w-5 h-5 text-blue-500" />
                Compartir Archivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!uploadComplete ? (
                <div className="space-y-4">
                  <Alert className="dark:border-blue-800 dark:bg-blue-900/20">
                    <AlertDescription className="dark:text-gray-300">
                      Use este enlace para subir el archivo que desea compartir. El enlace expira el {new Date(link.expiresAt).toLocaleString()}.
                    </AlertDescription>
                  </Alert>
                  
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={50 * 1024 * 1024} // 50MB
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonClassName="w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar Archivo</span>
                    </div>
                  </ObjectUploader>
                </div>
              ) : (
                <Alert className="border-green-200 dark:border-green-800 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="dark:text-gray-300">
                    Archivo subido exitosamente. El enlace de descarga está ahora disponible.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // File Share Download View
  if (link.type === 'file_share' && link.metadata?.fileUrl) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Download className="w-5 h-5 text-green-500" />
                Descargar Archivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="dark:border-green-800 dark:bg-green-900/20">
                <AlertDescription className="dark:text-gray-300">
                  Archivo disponible para descarga. 
                  {link.maxAccess && ` Descargas restantes: ${link.maxAccess - link.accessCount}`}
                </AlertDescription>
              </Alert>
              
              <Button onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Descargar Archivo
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Expira: {new Date(link.expiresAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <Card className="w-full max-w-md dark:bg-gray-800">
        <CardContent className="p-6 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Tipo de enlace no reconocido</p>
        </CardContent>
      </Card>
    </div>
  );
}