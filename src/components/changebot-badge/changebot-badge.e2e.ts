import { newE2EPage } from '@stencil/core/testing';

describe('changebot-badge e2e', () => {
  it('renders and displays badge correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge></changebot-badge>');

    const component = await page.find('changebot-badge');
    const badge = await page.find('changebot-badge >>> .badge');

    expect(component).toHaveClass('hydrated');
    expect(badge).toHaveClass('badge--hidden');
  });

  it('applies theme prop correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge theme="dark"></changebot-badge>');

    const badge = await page.find('changebot-badge >>> .badge');
    expect(badge).toHaveClass('badge--dark');
  });

  it('has correct initial aria-label', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge></changebot-badge>');

    const badge = await page.find('changebot-badge >>> .badge');
    expect(await badge.getAttribute('aria-label')).toBe('No new updates');
  });

  it('handles scope attribute correctly', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge scope="dashboard"></changebot-badge>');

    const component = await page.find('changebot-badge');
    expect(await component.getAttribute('data-scope')).toBe('dashboard');
  });

  it('renders with showCount prop', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-badge show-count="false"></changebot-badge>');

    const component = await page.find('changebot-badge');
    expect(await component.getProperty('showCount')).toBe(false);
  });
});