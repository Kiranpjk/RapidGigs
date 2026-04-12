import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
  asChild?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  asChild = false,
  className,
  ...props
}) => {
  // Base classes following Radix UI patterns with premium enhancements
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-2 hover-premium-shadow";

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary-foreground"
  };

  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
    xs: "h-8 px-2"
  };

  const Component = asChild ? React.Fragment : 'button';

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

export default Button;