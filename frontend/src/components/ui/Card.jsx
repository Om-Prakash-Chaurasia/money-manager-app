export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  hover = false,
  style = {},
  ...props
}) => {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
      style={style}
      {...props}
    >
      {(title || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.875rem'
          }}
        >
          <div>
            {title && (
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
