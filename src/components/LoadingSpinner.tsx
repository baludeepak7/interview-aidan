import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'info';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  variant = 'primary' 
}) => {
  const sizeClass = {
    sm: 'spinner-border-sm',
    md: '',
    lg: ''
  }[size];

  const style = size === 'lg' ? { width: '3rem', height: '3rem' } : {};

  return (
    <div className="text-center">
      <div 
        className={`spinner-border text-${variant} ${sizeClass}`} 
        role="status"
        style={style}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <div className="mt-2 text-muted">{text}</div>}
    </div>
  );
};