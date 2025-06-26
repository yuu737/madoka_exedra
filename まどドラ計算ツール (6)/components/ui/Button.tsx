
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = "font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center";

  const variantStyles = {
    primary: "bg-primary-light hover:bg-cyan-400 text-primary-dark shadow-md hover:shadow-lg ring-1 ring-primary-DEFAULT ring-offset-1 ring-offset-surface focus:ring-primary-DEFAULT",
    secondary: "bg-primary-light hover:bg-cyan-400 text-primary-dark shadow-md hover:shadow-lg ring-1 ring-primary-DEFAULT ring-offset-1 ring-offset-surface focus:ring-primary-DEFAULT",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg ring-1 ring-red-500 ring-offset-1 ring-offset-surface focus:ring-red-600",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type="button" // Default to type="button" to prevent accidental form submissions
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
