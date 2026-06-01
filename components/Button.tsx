import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-2.5 font-bold text-sm rounded transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-brand-yellow text-brand-navy hover:bg-brand-yellowHover shadow-md",
    secondary: "bg-brand-blue text-white hover:bg-[#2a3f6b] shadow-md",
    outline: "border-2 border-brand-navy text-brand-navy hover:bg-brand-gray",
    ghost: "text-brand-navy hover:bg-gray-100"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};