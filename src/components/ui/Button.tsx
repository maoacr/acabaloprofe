'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
      'disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

    const variants = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
      secondary: 'bg-muted text-foreground hover:bg-muted/80',
      ghost: 'text-foreground hover:bg-muted',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm min-w-[44px]',
      md: 'h-11 px-4 text-base min-w-[48px]',
      lg: 'h-12 px-6 text-lg min-w-[56px]',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? 'Cargando…' : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
