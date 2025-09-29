import { newE2EPage } from '@stencil/core/testing';

describe('changebot-drawer e2e', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-drawer></changebot-drawer>');

    const element = await page.find('changebot-drawer');
    expect(element).toHaveClass('hydrated');
  });

  it('renders with drawer-right class by default', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-drawer></changebot-drawer>');

    const drawer = await page.find('changebot-drawer >>> .drawer');
    const className = await drawer.getProperty('className');

    expect(className).toContain('drawer--right');
    expect(className).toContain('drawer--closed');
  });

  it('renders with drawer-left class when specified', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-drawer display-mode="drawer-left"></changebot-drawer>');

    const drawer = await page.find('changebot-drawer >>> .drawer');
    const className = await drawer.getProperty('className');

    expect(className).toContain('drawer--left');
  });

  it('renders with modal class when specified', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-drawer display-mode="modal"></changebot-drawer>');

    const drawer = await page.find('changebot-drawer >>> .drawer');
    const className = await drawer.getProperty('className');

    expect(className).toContain('drawer--modal');
  });

  it('shows close button', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-drawer></changebot-drawer>');

    const closeButton = await page.find('changebot-drawer >>> .close-button');
    expect(closeButton).not.toBeNull();
  });
});