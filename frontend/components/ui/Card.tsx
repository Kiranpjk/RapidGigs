import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'elevated' | 'outline';
}

const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  ...props
}) => {
  // Base classes
  const baseClasses = "rounded-lg border bg-card text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // Variant classes
  const variantClasses = {
    default: "shadow-sm",
    elevated: "shadow-md hover-premium-shadow hover:shadow-lg",
    outline: "border border-input bg-background hover:bg-muted"
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};

export default Card;