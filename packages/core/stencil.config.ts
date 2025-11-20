import { Config } from '@stencil/core';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';

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
    reactOutputTarget({
      componentCorePackage: '@changebot/core',
      proxiesFile: '../react/src/components/stencil-generated/index.ts',
      outDir: '../react/src/components/',
    }),
    vueOutputTarget({
      componentCorePackage: '@changebot/core',
      proxiesFile: '../vue/src/components/stencil-generated/index.ts',
      outDir: '../vue/src/components/',
    }),
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null, // disable service workers
      copy: [
        { src: 'dashboard.html' },
        { src: 'panel.html' },
        { src: 'banner.html' },
        { src: 'custom-theme.html' },
        { src: 'toast.html' },
        { src: 'production-demo.html' },
        { src: 'react-demo.html' },
        { src: 'vue-demo.html' },
      ],
    },
  ],
  testing: {
    browserHeadless: 'shell',
    setupFilesAfterEnv: ['./src/test-setup.js'],
  },
};
