import { createThemeManager, ThemeableComponent } from './theme-manager';
import { Theme } from './themes';

interface MatchMediaStub {
  setMatches(matches: boolean): void;
  fireChange(): void;
  listenerCount(): number;
}

function installMatchMedia(initialMatches: boolean): MatchMediaStub {
  let matches = initialMatches;
  const listeners = new Set<(e: { matches: boolean }) => void>();

  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
      listeners.delete(listener);
    },
  };

  (window as any).matchMedia = vi.fn().mockReturnValue(mql);

  return {
    setMatches(value: boolean) {
      matches = value;
    },
    fireChange() {
      listeners.forEach(listener => listener({ matches }));
    },
    listenerCount: () => listeners.size,
  };
}

describe('createThemeManager', () => {
  afterEach(() => {
    delete (window as any).matchMedia;
  });

  function manage(component: ThemeableComponent) {
    const onThemeChange = vi.fn();
    const manager = createThemeManager(component, onThemeChange);
    return { manager, onThemeChange };
  }

  it('uses the explicit theme prop over everything else', () => {
    installMatchMedia(true);
    const { manager, onThemeChange } = manage({ theme: 'nord' as Theme, light: 'gruvbox-light' as Theme, dark: 'gruvbox-dark' as Theme });

    expect(manager.getActiveTheme()).toBe('nord');
    expect(onThemeChange).toHaveBeenCalledWith('nord');
    // With an explicit theme there is no media query to watch
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it('picks dark when the system prefers dark', () => {
    installMatchMedia(true);
    const { manager } = manage({ light: 'gruvbox-light' as Theme, dark: 'gruvbox-dark' as Theme });

    expect(manager.getActiveTheme()).toBe('gruvbox-dark');
  });

  it('picks light when the system prefers light', () => {
    installMatchMedia(false);
    const { manager } = manage({ light: 'gruvbox-light' as Theme, dark: 'gruvbox-dark' as Theme });

    expect(manager.getActiveTheme()).toBe('gruvbox-light');
  });

  it('falls back to the light theme when only light is provided, even if the system prefers dark', () => {
    installMatchMedia(true);
    const { manager } = manage({ light: 'gruvbox-light' as Theme });

    expect(manager.getActiveTheme()).toBe('gruvbox-light');
  });

  it('falls back to the dark theme when only dark is provided, even if the system prefers light', () => {
    installMatchMedia(false);
    const { manager } = manage({ dark: 'gruvbox-dark' as Theme });

    expect(manager.getActiveTheme()).toBe('gruvbox-dark');
  });

  it('stays undefined when no theme props are provided', () => {
    installMatchMedia(false);
    const { manager, onThemeChange } = manage({});

    expect(manager.getActiveTheme()).toBeUndefined();
    expect(onThemeChange).not.toHaveBeenCalled();
  });

  it('switches theme when the system preference flips', () => {
    const media = installMatchMedia(false);
    const { manager, onThemeChange } = manage({ light: 'gruvbox-light' as Theme, dark: 'gruvbox-dark' as Theme });

    expect(manager.getActiveTheme()).toBe('gruvbox-light');

    media.setMatches(true);
    media.fireChange();

    expect(manager.getActiveTheme()).toBe('gruvbox-dark');
    expect(onThemeChange).toHaveBeenLastCalledWith('gruvbox-dark');
  });

  it('cleanup removes the media query listener', () => {
    const media = installMatchMedia(false);
    const { manager, onThemeChange } = manage({ light: 'gruvbox-light' as Theme, dark: 'gruvbox-dark' as Theme });

    manager.cleanup();
    expect(media.listenerCount()).toBe(0);

    onThemeChange.mockClear();
    media.setMatches(true);
    media.fireChange();
    expect(onThemeChange).not.toHaveBeenCalled();
  });
});
