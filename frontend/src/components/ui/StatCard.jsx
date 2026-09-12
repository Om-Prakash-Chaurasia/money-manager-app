export const StatCard = ({
  label,
  title,
  value,
  subtext,
  subtitle,
  icon: Icon,
  iconBg = 'var(--color-primary-glow)',
  iconColor = 'var(--color-primary)',
  valueColor = null,
  trend = null,
  trendType = 'neutral', // 'positive' | 'negative' | 'neutral'
  className = ''
}) => {
  const displayLabel = label || title;
  const displaySubtext = subtext || subtitle;
  const isTrendTypeOnly = trend === 'positive' || trend === 'negative' || trend === 'neutral';
  const effectiveTrendType = isTrendTypeOnly ? trend : trendType;
  const displayTrend = isTrendTypeOnly ? null : trend;

  return (
    <div className={`stat-card ${className}`}>
      {Icon && (
        <div
          className="stat-icon-wrapper"
          style={{ background: iconBg, color: iconColor }}
        >
          <Icon size={24} />
        </div>
      )}
      <div className="stat-info">
        <span className="stat-label">{displayLabel}</span>
        <span className="stat-value" style={valueColor ? { color: valueColor } : undefined}>{value}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
          {displayTrend !== null && displayTrend !== undefined && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color:
                  effectiveTrendType === 'positive'
                    ? 'var(--color-income)'
                    : effectiveTrendType === 'negative'
                    ? 'var(--color-expense)'
                    : 'var(--text-secondary)'
              }}
            >
              {displayTrend}
            </span>
          )}
          {displaySubtext && <span className="stat-subtext">{displaySubtext}</span>}
        </div>
      </div>
    </div>
  );
};
