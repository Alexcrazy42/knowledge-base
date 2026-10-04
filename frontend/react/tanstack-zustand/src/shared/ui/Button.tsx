import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/cn';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'disabled:pointer-events-none disabled:opacity-50',
        'bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2',
        className
      )}
      {...props}
    />
  )
);