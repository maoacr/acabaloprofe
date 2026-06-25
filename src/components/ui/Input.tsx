'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightAdornment?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, rightAdornment, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border bg-background px-3 py-2.5 text-base',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50',
              error ? 'border-red-500' : 'border-input',
              rightAdornment ? 'pr-12' : '',
              className,
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightAdornment && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">{rightAdornment}</div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
