import { newE2EPage } from '@stencil/core/testing';

describe('changebot-panel e2e', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-panel></changebot-panel>');

    const element = await page.find('changebot-panel');
    expect(element).toHaveClass('hydrated');
  });

  it('renders with drawer-right class by default', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-panel></changebot-panel>');

    const drawer = await page.find('changebot-panel >>> .panel');
    const className = await drawer.getProperty('className');

    expect(className).toContain('panel--right');
    expect(className).toContain('panel--closed');
  });

  it('renders with drawer-left class when specified', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-panel display-mode="drawer-left"></changebot-panel>');

    const drawer = await page.find('changebot-panel >>> .panel');
    const className = await drawer.getProperty('className');

    expect(className).toContain('panel--left');
  });

  it('renders with modal class when specified', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-panel display-mode="modal"></changebot-panel>');

    const drawer = await page.find('changebot-panel >>> .panel');
    const className = await drawer.getProperty('className');

    expect(className).toContain('panel--modal');
  });

  it('shows close button', async () => {
    const page = await newE2EPage();
    await page.setContent('<changebot-panel></changebot-panel>');

    const closeButton = await page.find('changebot-panel >>> .close-button');
    expect(closeButton).not.toBeNull();
  });
});