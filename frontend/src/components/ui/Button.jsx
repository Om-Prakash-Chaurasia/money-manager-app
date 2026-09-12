import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  icon: Icon = null,
  className = '',
  onClick,
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';

  return (
    <button
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} style={{ animation: 'spin 1s linear infinite' }} />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 16 : 18} />
      ) : null}
      {children}
    </button>
  );
};
