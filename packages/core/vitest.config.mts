import { defineVitestConfig } from '@stencil/vitest/config';
import { stencilVitestPlugin } from '@stencil/vitest/plugin';

export default defineVitestConfig({
  stencilConfig: './stencil.config.ts',
  test: {
    projects: [
      {
        // The plugin compiles component .tsx on the fly, so a spec importing a
        // component and a spec importing src/store/registry share one module
        // instance. Loading the built bundle instead would give the components
        // their own copy of the registry, and a store registered by a test
        // would be invisible to them.
        plugins: [stencilVitestPlugin()],
        test: {
          name: 'spec',
          include: ['src/**/*.spec.ts'],
          environment: 'stencil',
          globals: true,
          setupFiles: ['./vitest-setup.ts'],
        },
      },
    ],
  },
});
