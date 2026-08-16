import { User } from 'lucide-react';

interface UserPlaceholderProps {
  className?: string;
  iconClassName?: string;
}

export default function UserPlaceholder({ className, iconClassName }: UserPlaceholderProps) {
  return (
    <div className={`flex items-center justify-center ${className || ''}`}>
      <User className={iconClassName || 'w-2/5 h-2/5 text-slate-500 dark:text-slate-400'} fill="currentColor" strokeWidth={1.5} />
    </div>
  );
}