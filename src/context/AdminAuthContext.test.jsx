import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext.jsx';
import { hashPin } from '../lib/utils.js';

const CONFIG_KEY = 'statedge_admin_config';
const SESSION_KEY = 'statedge_admin_session';

// ─── Test component ───────────────────────────────────────────────────────────

function AuthStatus() {
  const { isAdmin, hasPin, error } = useAdminAuth();
  return (
    <div>
      <span data-testid="is-admin">{String(isAdmin)}</span>
      <span data-testid="has-pin">{String(hasPin)}</span>
      <span data-testid="error">{error}</span>
    </div>
  );
}

function LoginButton({ pin }) {
  const { login } = useAdminAuth();
  return <button onClick={() => login(pin)}>Login</button>;
}

function LogoutButton() {
  const { logout } = useAdminAuth();
  return <button onClick={logout}>Logout</button>;
}

function renderAuth(children) {
  return render(<AdminAuthProvider>{children}</AdminAuthProvider>);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminAuthContext — no PIN set', () => {
  beforeEach(() => {
    localStorage.removeItem(CONFIG_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  });

  it('isAdmin is false initially', () => {
    renderAuth(<AuthStatus />);
    expect(screen.getByTestId('is-admin').textContent).toBe('false');
  });

  it('hasPin is false when no PIN configured', () => {
    renderAuth(<AuthStatus />);
    expect(screen.getByTestId('has-pin').textContent).toBe('false');
  });

  it('login() with no PIN set resolves to true immediately', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="" /></>);
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('is-admin').textContent).toBe('true');
  });

  it('successful login sets sessionStorage', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="" /></>);
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('true');
  });
});

describe('AdminAuthContext — PIN set', () => {
  beforeEach(async () => {
    sessionStorage.removeItem(SESSION_KEY);
    const pinHash = await hashPin('1234');
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ pinHash }));
  });

  it('hasPin is true when PIN is configured', () => {
    renderAuth(<AuthStatus />);
    expect(screen.getByTestId('has-pin').textContent).toBe('true');
  });

  it('correct PIN → isAdmin becomes true', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="1234" /></>);
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('is-admin').textContent).toBe('true');
  });

  it('wrong PIN → isAdmin stays false and error is set', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="wrong" /></>);
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('is-admin').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toMatch(/incorrect/i);
  });

  it('wrong PIN does NOT set sessionStorage', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="wrong" /></>);
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('AdminAuthContext — logout', () => {
  it('clears isAdmin and sessionStorage', async () => {
    renderAuth(<><AuthStatus /><LoginButton pin="" /><LogoutButton /></>);
    // Login first
    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });
    expect(screen.getByTestId('is-admin').textContent).toBe('true');

    // Then logout
    await act(async () => {
      await userEvent.click(screen.getByText('Logout'));
    });
    expect(screen.getByTestId('is-admin').textContent).toBe('false');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('AdminAuthContext — session persistence', () => {
  it('restores isAdmin=true from sessionStorage on mount', () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    renderAuth(<AuthStatus />);
    expect(screen.getByTestId('is-admin').textContent).toBe('true');
  });
});
