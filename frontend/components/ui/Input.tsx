import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Input: React.FC<InputProps> = ({
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const baseClasses = "flex w-full rounded-md border border-input bg-background text-sm transition-premium ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 hover-premium-shadow";

  const variantClasses = {
    default: "bg-background",
    outline: "border-border"
  };

  const sizeClasses = {
    sm: "h-9 rounded-md px-3",
    md: "h-10 rounded-md px-3 py-2",
    lg: "h-11 rounded-md px-4 py-3"
  };

  return (
    <input
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

export default Input;