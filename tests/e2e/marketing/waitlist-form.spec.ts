import { expect, test } from '@playwright/test';

/**
 * The waitlist form (`/preregister`) — render + CLIENT-SIDE validation only.
 *
 * ⚠️ END-TO-END SUBMISSION IS DELIBERATELY NOT EXERCISED. A successful submit
 * writes a real signup into the single PRODUCTION Firestore (poolmobile #602's
 * subject — there is no staging waitlist), so this spec proves the form
 * validates before any network call and additionally intercepts the submit
 * endpoint to PROVE no request left the page.
 */
test.describe('Waitlist form', () => {
  test('renders and validates client-side without submitting anything', async ({ page }) => {
    let submitAttempted = false;
    await page.route('**/api/preregister', (route) => {
      submitAttempted = true;
      return route.abort();
    });

    await page.goto('/preregister');
    await expect(page.getByRole('heading', { name: 'Preregister for Pool' })).toBeVisible();

    const firstName = page.getByPlaceholder('Enter your first name');
    const lastName = page.getByPlaceholder('Enter your last name');
    const email = page.getByPlaceholder('your@email.com');
    await expect(firstName).toBeVisible();
    await expect(lastName).toBeVisible();
    await expect(email).toBeVisible();

    const submit = page.getByRole('button', { name: 'Preregister', exact: true });

    // Empty form: every field refuses, nothing is sent.
    await submit.click();
    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();

    // Malformed email: refused client-side, still nothing sent. The value
    // passes the browser's native `type="email"` constraint (which would
    // otherwise swallow the submit before the page's handler runs) but fails
    // the page's own dot-requiring regex — so the PAGE's validation renders.
    await firstName.fill('Playwright');
    await lastName.fill('Harness');
    await email.fill('almost@valid');
    await submit.click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();

    expect(submitAttempted, 'the waitlist submit endpoint must never be called').toBe(false);
  });
});
