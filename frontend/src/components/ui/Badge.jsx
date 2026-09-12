export const Badge = ({
  children,
  variant = 'default', // 'income' | 'expense' | 'transfer' | 'warning' | 'info' | 'default'
  size = 'md',
  className = '',
  icon: Icon = null
}) => {
  const variantClass = variant !== 'default' ? `badge-${variant}` : '';
  const sizeStyle = size === 'sm' ? { padding: '0.125rem 0.5rem', fontSize: '0.6875rem' } : {};

  return (
    <span
      className={`badge ${variantClass} ${className}`}
      style={{
        ...sizeStyle,
        backgroundColor: variant === 'default' ? 'var(--bg-surface-elevated)' : undefined,
        color: variant === 'default' ? 'var(--text-secondary)' : undefined,
        border: variant === 'default' ? '1px solid var(--border-card)' : undefined
      }}
    >
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
};
