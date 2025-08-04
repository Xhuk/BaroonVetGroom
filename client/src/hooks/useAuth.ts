import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  // Try normal auth first, fallback to preview mode if needed
  const { data: user, isLoading: authLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: previewUser, isLoading: previewLoading } = useQuery<User>({
    queryKey: ["/api/preview/user"],
    enabled: !user && !authLoading, // Only try preview if normal auth failed
    retry: false,
  });

  const finalUser = user || previewUser;
  const finalLoading = authLoading || previewLoading;

  return {
    user: finalUser,
    isLoading: finalLoading,
    isAuthenticated: !!finalUser,
    isPreviewMode: !!previewUser && !user,
  };
}
