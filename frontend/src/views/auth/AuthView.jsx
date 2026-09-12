import { useState } from 'react';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button, Input, Select } from '../../components/ui/index.js';

export const AuthView = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          showToast('Please enter your full name', 'warning');
          setLoading(false);
          return;
        }
        await register({ name, email, password, currency });
        showToast('Account created successfully! Welcome to Money Manager.', 'success');
      } else {
        await login(email, password);
        showToast('Logged in successfully!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('usera@example.com');
    setPassword('Password123');
    setLoading(true);
    try {
      await login('usera@example.com', 'Password123');
      showToast('Logged in as Demo User!', 'success');
    } catch (err) {
      // If user doesn't exist yet, register demo user
      try {
        await register({
          name: 'Demo Investor',
          email: 'usera@example.com',
          password: 'Password123',
          currency: 'INR'
        });
        showToast('Demo account created and signed in!', 'success');
      } catch (regErr) {
        showToast(regErr.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background:
          'radial-gradient(ellipse at 50% 10%, rgba(16, 185, 129, 0.15), transparent 60%), var(--bg-body)'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '2.5rem',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Brand Emblem */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: '1rem'
            }}
          >
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Money Manager</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {isRegister
              ? 'Start tracking your wealth with double-entry precision'
              : 'Sign in to access your ledger and portfolios'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <Input
              label="Full Name"
              type="text"
              icon={UserIcon}
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Email Address"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isRegister && (
            <Select
              label="Primary Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: 'INR (₹) - Indian Rupee' },
                { value: 'USD', label: 'USD ($) - US Dollar' },
                { value: 'EUR', label: 'EUR (€) - Euro' },
                { value: 'GBP', label: 'GBP (£) - British Pound' },
                { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
                { value: 'SGD', label: 'SGD ($) - Singapore Dollar' }
              ]}
            />
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon={ArrowRight}
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {isRegister ? 'Create Account' : 'Sign In'}
          </Button>

          {/* Quick Demo Access */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={ShieldCheck}
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            Quick Demo Login (User A)
          </Button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          </span>
          <button
            type="button"
            onClick={() => setIsRegister((prev) => !prev)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Sign In' : 'Create One'}
          </button>
        </div>
      </div>
    </div>
  );
};
