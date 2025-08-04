import { ReactNode } from 'react';
import { usePagePreCache } from '@/hooks/usePagePreCache';

interface PreCacheOnHoverProps {
  route: string;
  children: ReactNode;
  className?: string;
}

export function PreCacheOnHover({ route, children, className }: PreCacheOnHoverProps) {
  const { preCachePage } = usePagePreCache();

  return (
    <div
      onMouseEnter={() => preCachePage(route)}
      className={className}
    >
      {children}
    </div>
  );
}