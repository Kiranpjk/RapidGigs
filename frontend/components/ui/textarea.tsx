import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Textarea: React.FC<TextareaProps> = ({
  variant = 'default',
  size = 'md',
  className,
  ...props
}) => {
  const baseClasses = "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-premium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none hover-premium-shadow";

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
    <textarea
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

export default Textarea;