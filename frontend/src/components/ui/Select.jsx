export const Select = ({
  label,
  error,
  id,
  options = [],
  placeholder = 'Select an option',
  required = false,
  className = '',
  value,
  onChange,
  ...props
}) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label} {required && <span style={{ color: 'var(--color-expense)' }}>*</span>}
        </label>
      )}
      <select
        id={selectId}
        className="select-field"
        value={value}
        onChange={onChange}
        required={required}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <div className="input-error-msg">{error}</div>}
    </div>
  );
};
