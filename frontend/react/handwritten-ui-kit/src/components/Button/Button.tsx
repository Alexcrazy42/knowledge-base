import React, { forwardRef } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'medium', 
    loading = false, 
    icon, 
    children, 
    disabled,
    className,
    ...rest 
  }, ref) => {
    const buttonClasses = [
      styles.button,
      styles[`variant-${variant}`],
      styles[`size-${size}`],
      loading && styles['is-loading'],
      disabled && styles['is-disabled'],
      className
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <span className={styles.spinner}>⟳</span>}
        {icon && !loading && <span className={styles.icon}>{icon}</span>}
        {children && <span className={styles.text}>{children}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;