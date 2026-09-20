import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey: string;
}

export default function PageTransition({ children }: PageTransitionProps) {
  return <>{children}</>;
}
