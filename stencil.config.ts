import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'widgets',
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      copy: [{ src: 'panel.html' }, { src: 'banner.html' }, { src: 'custom-theme.html' }, { src: 'toast.html' }],
    },
  ],
  testing: {
    browserHeadless: 'shell',
  },
};
