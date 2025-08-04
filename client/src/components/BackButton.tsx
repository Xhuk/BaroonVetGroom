import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  className?: string;
  href?: string;
}

export function BackButton({ className = "", href }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (href) {
      setLocation(href);
    } else {
      window.history.back();
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      Regresar
    </Button>
  );
}