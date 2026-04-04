import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, ArrowLeft, Lock, KeyRound } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { AppHeader } from '../components/layout/AppHeader.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Button } from '../components/ui/Button.jsx';
import { FormField, Input } from '../components/ui/FormField.jsx';
import './AdminLoginPage.css';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { isAdmin, hasPin, login, setPin, error, setError, loading } = useAdminAuth();
  const [pin, setLocalPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Setup flow
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    if (isAdmin) navigate('/admin/dashboard', { replace: true });
  }, [isAdmin, navigate]);

  // No PIN set → offer to set one or enter without PIN
  async function handleOpenLogin() {
    await login('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    await login(pin);
  }

  async function handleSetPin(e) {
    e.preventDefault();
    if (newPin.length < 4) { setSetupError('PIN must be at least 4 characters.'); return; }
    if (newPin !== confirmPin) { setSetupError('PINs do not match.'); return; }
    await setPin(newPin);
    await login(newPin);
  }

  return (
    <div className="admin-login-page">
      <AppHeader />

      <main className="admin-login-main">
        <Link to="/" className="admin-back-link">
          <ArrowLeft size={15} /> Back to Home
        </Link>

        <div className="admin-login-card">
          <div className="admin-login-icon">
            <Shield size={28} />
          </div>

          <h1 className="admin-login-title">Admin Portal</h1>
          <p className="admin-login-sub">
            {setupMode
              ? 'Set up a PIN to protect your admin portal.'
              : hasPin
              ? 'Enter your PIN to access tournament management.'
              : 'No PIN is set. You can enter directly or set a PIN for security.'}
          </p>

          {setupMode ? (
            <form onSubmit={handleSetPin} className="admin-login-form">
              <FormField label="New PIN" error={setupError}>
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={e => { setNewPin(e.target.value); setSetupError(''); }}
                  placeholder="Min. 4 characters"
                  autoFocus
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="Confirm PIN">
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value)}
                  placeholder="Repeat PIN"
                />
              </FormField>
              <button
                type="button"
                className="admin-show-pin"
                onClick={() => setShowPin(s => !s)}
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPin ? 'Hide' : 'Show'} PIN
              </button>
              <div className="admin-form-actions">
                <Button type="button" variant="secondary" onClick={() => setSetupMode(false)}>Back</Button>
                <Button type="submit" variant="accent" icon={<KeyRound size={15} />} loading={loading}>
                  Set PIN &amp; Login
                </Button>
              </div>
            </form>
          ) : hasPin ? (
            <form onSubmit={handleLogin} className="admin-login-form">
              <FormField label="Admin PIN" error={error}>
                <div className="pin-input-wrap">
                  <Lock size={14} className="pin-input-icon" />
                  <input
                    className="pin-input"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => { setLocalPin(e.target.value); setError(''); }}
                    placeholder="Enter PIN"
                    autoFocus
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="pin-toggle"
                    onClick={() => setShowPin(s => !s)}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>
              <Button type="submit" variant="accent" size="lg" loading={loading} style={{ width: '100%' }}>
                Login
              </Button>
            </form>
          ) : (
            <div className="admin-open-actions">
              <Button variant="accent" size="lg" onClick={handleOpenLogin} loading={loading} style={{ width: '100%' }}>
                Enter Admin Portal
              </Button>
              <button className="admin-setup-link" onClick={() => setSetupMode(true)}>
                <KeyRound size={14} /> Set up a PIN for security
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
