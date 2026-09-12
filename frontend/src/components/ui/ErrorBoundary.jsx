import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled UI error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--bg-body)',
            color: 'var(--text-primary)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              padding: '2rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.12)',
                color: 'var(--color-expense)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Something went wrong
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
              </p>
            </div>

            <Button variant="primary" icon={RefreshCw} onClick={this.handleReload}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
