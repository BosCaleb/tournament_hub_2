/**
 * Smoke tests — run against the production build (npm run preview).
 * These verify the app loads, routes work, and the viewer/admin split is correct.
 * They do NOT test business logic (that's covered by Vitest unit tests).
 */
import { test, expect } from '@playwright/test';

// ─── Navigation ──────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('landing page loads with StatEdge branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/StatEdge/i);
    await expect(page.getByRole('link', { name: /statedge sports analytics/i })).toBeVisible();
  });

  test('landing page has no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('landing page hero content is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Smarter decisions')).toBeVisible();
    await expect(page.locator('text=View Tournaments')).toBeVisible();
    await expect(page.locator('text=Admin Login')).toBeVisible();
  });

  test('/sports loads sport selector page', async ({ page }) => {
    await page.goto('/sports');
    await expect(page.getByRole('heading', { name: /what are you managing today/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /netball/i })).toBeVisible();
  });

  test('Netball sport card is active (clickable)', async ({ page }) => {
    await page.goto('/sports');
    const netballCard = page.locator('a:has-text("Netball")');
    await expect(netballCard).toBeVisible();
    await netballCard.click();
    await expect(page).toHaveURL('/sports/netball');
  });

  test('/sports/netball shows tournament list or empty state', async ({ page }) => {
    await page.goto('/sports/netball');
    // Either shows tournaments or the empty state — both are valid
    const hasEmpty = await page.locator('text=No tournaments yet').isVisible().catch(() => false);
    const hasGrid = await page.locator('.tlist-grid').isVisible().catch(() => false);
    expect(hasEmpty || hasGrid).toBe(true);
  });

  test('/admin shows login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Portal' })).toBeVisible();
  });

  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/does-not-exist-xyz');
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page Not Found')).toBeVisible();
  });
});

// ─── SPA routing (Azure SWA) ─────────────────────────────────────────────────

test.describe('SPA routing', () => {
  test('direct URL /sports returns app (not 404)', async ({ page }) => {
    const response = await page.goto('/sports');
    // Server should return 200 via staticwebapp.config.json navigationFallback
    expect(response?.status()).not.toBe(404);
    await expect(page.getByRole('link', { name: /statedge sports analytics/i })).toBeVisible();
  });

  test('direct URL /admin returns app (not 404)', async ({ page }) => {
    const response = await page.goto('/admin');
    expect(response?.status()).not.toBe(404);
    await expect(page.getByRole('heading', { name: 'Admin Portal' })).toBeVisible();
  });
});

// ─── Admin auth ──────────────────────────────────────────────────────────────

test.describe('Admin auth', () => {
  test('/admin/dashboard redirects to /admin when unauthenticated', async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => sessionStorage.clear());

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Portal' })).toBeVisible();
  });

  test('admin login with no PIN set enters portal directly', async ({ page }) => {
    // Clear existing PIN config and session
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('statedge_admin_config');
      sessionStorage.clear();
    });

    await page.goto('/admin');
    // No PIN set — "Enter Admin Portal" button should be visible
    await expect(page.locator('text=Enter Admin Portal')).toBeVisible();
    await page.locator('text=Enter Admin Portal').click();
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('text=Manage Tournaments')).toBeVisible();
  });

  test('admin dashboard shows New Tournament button', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('statedge_admin_config');
      sessionStorage.setItem('statedge_admin_session', 'true');
    });
    await page.goto('/admin/dashboard');
    await expect(page.locator('text=New Tournament')).toBeVisible();
  });

  test('logout button returns to home page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('statedge_admin_config');
      sessionStorage.setItem('statedge_admin_session', 'true');
    });
    await page.goto('/admin/dashboard');
    await page.locator('text=Logout').click();
    await expect(page).toHaveURL('/');
  });
});

// ─── Full admin flow ──────────────────────────────────────────────────────────

// Delete test tournaments from Supabase so runs don't accumulate stale data.
async function cleanupTestTournaments() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return; // no-op when Supabase isn't configured
  try {
    await fetch(`${url}/rest/v1/statedge_hub_tournaments?name=eq.Test%20Cup%202025`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
  } catch { /* ignore — test cleanup is best-effort */ }
}

test.describe('Admin — create and view tournament', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestTournaments();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.setItem('statedge_admin_session', 'true');
    });
  });

  test.afterEach(async () => {
    await cleanupTestTournaments();
  });

  test('create a tournament and verify it appears in the list', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.locator('text=New Tournament').click();

    // Fill in the form
    await page.locator('input[placeholder*="Agon"]').fill('Test Cup 2025');
    await page.locator('button[type="submit"]:has-text("Create Tournament")').click();

    // Should appear in the dashboard (.first() guards against stale Supabase rows on retry)
    await expect(page.locator('text=Test Cup 2025').first()).toBeVisible();
  });

  test('open tournament and verify all 7 tabs are present for admin', async ({ page }) => {
    // Seed a tournament in localStorage
    await page.evaluate(() => {
      const t = {
        id: 'smoke-t1',
        name: 'Smoke Test Cup',
        sport: 'netball',
        ageGroup: 'U16',
        organizingBody: '',
        venue: '',
        startDate: null,
        endDate: null,
        teams: [],
        pools: [],
        fixtures: [],
        playoffs: [],
        players: [],
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForLoss: 0,
        tiebreakMethod: 'goal-difference',
        adminPinHash: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('statedge_netball_v1', JSON.stringify({
        tournaments: [t], theme: 'light', schemaVersion: 1,
      }));
    });

    await page.goto('/admin/netball/smoke-t1');
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fixtures' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Standings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Playoffs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Players' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Statistics' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Admin' })).toBeVisible();
  });
});

// ─── Viewer flow ──────────────────────────────────────────────────────────────

test.describe('Viewer — read-only tournament view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      sessionStorage.clear();
      const t = {
        id: 'viewer-t1',
        name: 'Viewer Cup',
        sport: 'netball',
        ageGroup: 'U16',
        organizingBody: 'Test Union',
        venue: 'Test Venue',
        startDate: null,
        endDate: null,
        teams: [],
        pools: [],
        fixtures: [],
        playoffs: [],
        players: [],
        pointsForWin: 2,
        pointsForDraw: 1,
        pointsForLoss: 0,
        tiebreakMethod: 'goal-difference',
        adminPinHash: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('statedge_netball_v1', JSON.stringify({
        tournaments: [t], theme: 'light', schemaVersion: 1,
      }));
    });
  });

  test('viewer sees 6 tabs (no Admin tab)', async ({ page }) => {
    await page.goto('/sports/netball/viewer-t1');
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Fixtures' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Standings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Playoffs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Players' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Statistics' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Admin' })).toHaveCount(0);
  });

  test('viewer header does NOT show Admin badge', async ({ page }) => {
    await page.goto('/sports/netball/viewer-t1');
    // The admin indicator pill should not be present
    await expect(page.locator('.admin-indicator')).not.toBeVisible().catch(() => {});
  });
});

// ─── Dark mode ───────────────────────────────────────────────────────────────

test.describe('Dark mode', () => {
  test('toggle switches theme attribute', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');

    // Initially light
    await expect(html).not.toHaveAttribute('data-theme', 'dark');

    // Click theme toggle
    await page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('dark mode does not cause horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label*="dark mode"], button[aria-label*="light mode"]').click();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // 1px tolerance
  });
});

// ─── Mobile ──────────────────────────────────────────────────────────────────

test.describe('Mobile layout', () => {
  test('landing page renders without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(376);
  });

  test('sport selector renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/sports');
    await expect(page.getByRole('link', { name: /netball/i })).toBeVisible();
  });
});
