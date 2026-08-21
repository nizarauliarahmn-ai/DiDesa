import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardWrapperProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CardWrapper({ 
  title, 
  icon: Icon, 
  children, 
  className = '',
  headerClassName = ''
}: CardWrapperProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-4 ${className}`}>
      <div className={`flex items-center gap-3 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 ${headerClassName}`}>
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-emerald-600" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function TopSectionCards({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}

export function MiddleSectionCards({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  );
}

export function BottomSectionCard({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-6 pt-2">
      {children}
    </div>
  );
}