/**
 * Theme management utility for Stencil components
 * Handles media query listeners and theme preference cascading
 */

import { Theme } from './themes';

export interface ThemeableComponent {
  theme?: Theme;
  light?: Theme;
  dark?: Theme;
}

export interface ThemeManager {
  /** Get the current active theme */
  getActiveTheme(): Theme | undefined;
  /** Clean up media query listeners */
  cleanup(): void;
}

/**
 * Creates a theme manager for a Stencil component.
 * Handles media query listeners and theme preference cascading.
 *
 * @param component - The component instance with theme props
 * @param onThemeChange - Callback when activeTheme changes
 * @returns ThemeManager with getActiveTheme() and cleanup() methods
 */
export function createThemeManager(
  component: ThemeableComponent,
  onThemeChange: (activeTheme: Theme | undefined) => void
): ThemeManager {
  let mediaQuery: MediaQueryList | undefined;
  let mediaQueryListener: ((e: MediaQueryListEvent) => void) | undefined;
  let activeTheme: Theme | undefined;

  function updateActiveTheme(): void {
    // If theme is explicitly set, use it
    if (component.theme) {
      activeTheme = component.theme;
      onThemeChange(activeTheme);
      return;
    }

    // Use system preference to choose between light and dark
    const prefersDark = mediaQuery?.matches || window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (prefersDark && component.dark) {
      activeTheme = component.dark;
    } else if (!prefersDark && component.light) {
      activeTheme = component.light;
    } else if (component.light) {
      activeTheme = component.light;
    } else if (component.dark) {
      activeTheme = component.dark;
    }

    onThemeChange(activeTheme);
  }

  function setup(): void {
    // If theme is explicitly set, use it
    if (component.theme) {
      activeTheme = component.theme;
      onThemeChange(activeTheme);
      return;
    }

    // If light and dark are provided, listen to system preference
    if (component.light || component.dark) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      updateActiveTheme();

      // Listen for changes in system preference
      mediaQueryListener = () => {
        updateActiveTheme();
      };
      mediaQuery.addEventListener('change', mediaQueryListener);
    }
  }

  function cleanup(): void {
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener('change', mediaQueryListener);
    }
  }

  function getActiveTheme(): Theme | undefined {
    return activeTheme;
  }

  // Initialize
  setup();

  return {
    getActiveTheme,
    cleanup,
  };
}
