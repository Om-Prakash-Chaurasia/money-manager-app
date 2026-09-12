import { useRef } from 'react';
import { Calendar } from 'lucide-react';

export const Input = ({
  label,
  error,
  helperText,
  id,
  type = 'text',
  required = false,
  icon: Icon = null,
  className = '',
  onClick,
  style = {},
  ...props
}) => {
  const inputRef = useRef(null);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const isDateOrMonth = type === 'date' || type === 'month';
  const EffectiveLeftIcon = isDateOrMonth ? null : Icon;

  const handleClick = (e) => {
    if (isDateOrMonth) {
      try {
        inputRef.current?.showPicker?.();
      } catch (_) {}
    }
    onClick?.(e);
  };

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label} {required && <span style={{ color: 'var(--color-expense)' }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {EffectiveLeftIcon && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              zIndex: 1
            }}
          >
            <EffectiveLeftIcon size={18} />
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type={type}
          className={`input-field ${isDateOrMonth ? 'date-input-field' : ''}`}
          style={{
            ...(EffectiveLeftIcon ? { paddingLeft: '40px' } : {}),
            ...(isDateOrMonth ? { paddingRight: '40px', cursor: 'pointer' } : {}),
            ...style
          }}
          required={required}
          onClick={handleClick}
          {...props}
        />

        {isDateOrMonth && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 2
            }}
          >
            <Calendar size={18} />
          </div>
        )}
      </div>
      {error && <div className="input-error-msg">{error}</div>}
      {helperText && !error && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{helperText}</div>
      )}
    </div>
  );
};
