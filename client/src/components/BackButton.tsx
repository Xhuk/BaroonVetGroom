import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  className?: string;
  href?: string;
  text?: string;
  variant?: "outline" | "ghost" | "default" | "destructive" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  testId?: string;
}

export function BackButton({ 
  className = "", 
  href, 
  text = "Volver", 
  variant = "outline",
  size = "default",
  testId = "button-back"
}: BackButtonProps) {
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
      variant={variant}
      size={size}
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
      data-testid={testId}
    >
      <ArrowLeft className="w-4 h-4" />
      {text}
    </Button>
  );
}