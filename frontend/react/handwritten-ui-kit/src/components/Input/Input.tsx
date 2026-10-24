import React, { forwardRef } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, prefixNode, suffixNode, size = 'medium', className, ...rest }, ref) => {
    const wrapperClasses = [
      styles.wrapper,
      styles[`size-${size}`],
      error && styles['has-error'],
      rest.disabled && styles['is-disabled'],
      className
    ].filter(Boolean).join(' ');

    return (
      <div className={wrapperClasses}>
        {prefixNode && <span className={styles.prefix}>{prefixNode}</span>}
        
        <input 
          ref={ref} 
          className={styles.field}
          {...rest} 
        />
        
        {suffixNode && <span className={styles.suffix}>{suffixNode}</span>}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    );
  }
);

export default Input;