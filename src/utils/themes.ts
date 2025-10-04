/**
 * Color theme palettes
 * Supports: Catppuccin, Gruvbox, Dracula, Nord, Solarized, Everforest, Tokyo Night
 */

// Generic theme palette interface
export interface ThemePalette {
  // Background layers
  bg: string;
  bgAlt: string;
  surface: string;

  // Text colors
  text: string;
  textMuted: string;

  // UI elements
  border: string;
  hover: string;

  // Accent colors
  primary: string;
  link: string;
  focus: string;
  accent: string;     // For titles, highlighted text
  meta: string;       // For dates, timestamps, metadata
  subtle: string;     // For decorative elements, borders

  // Shadows and overlays
  shadow: string;
  backdrop: string;
}

// Catppuccin Latte (Light)
export const catppuccinLatte: ThemePalette = {
  bg: '#eff1f5',
  bgAlt: '#e6e9ef',
  surface: '#dce0e8',
  text: '#4c4f69',
  textMuted: '#6c6f85',
  border: '#ccd0da',
  hover: '#dce0e8',
  primary: '#1e66f5',
  link: '#1e66f5',
  focus: '#1e66f5',
  accent: '#8839ef',      // mauve - for titles
  meta: '#179299',        // teal - for dates/metadata
  subtle: '#7287fd',      // lavender - for decorative elements
  shadow: 'rgba(76, 79, 105, 0.1)',
  backdrop: 'rgba(76, 79, 105, 0.5)'
};

// Catppuccin Frappé (Dark)
export const catppuccinFrappe: ThemePalette = {
  bg: '#303446',
  bgAlt: '#292c3c',
  surface: '#232634',
  text: '#c6d0f5',
  textMuted: '#a5adce',
  border: '#414559',
  hover: '#414559',
  primary: '#8caaee',
  link: '#8caaee',
  focus: '#8caaee',
  accent: '#ca9ee6',      // mauve - for titles
  meta: '#81c8be',        // teal - for dates/metadata
  subtle: '#babbf1',      // lavender - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(0, 0, 0, 0.5)'
};

// Catppuccin Macchiato (Dark)
export const catppuccinMacchiato: ThemePalette = {
  bg: '#24273a',
  bgAlt: '#1e2030',
  surface: '#181926',
  text: '#cad3f5',
  textMuted: '#a5adcb',
  border: '#363a4f',
  hover: '#363a4f',
  primary: '#8aadf4',
  link: '#8aadf4',
  focus: '#8aadf4',
  accent: '#c6a0f6',      // mauve - for titles
  meta: '#8bd5ca',        // teal - for dates/metadata
  subtle: '#b7bdf8',      // lavender - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(0, 0, 0, 0.5)'
};

// Catppuccin Mocha (Dark)
export const catppuccinMocha: ThemePalette = {
  bg: '#1e1e2e',
  bgAlt: '#181825',
  surface: '#11111b',
  text: '#cdd6f4',
  textMuted: '#a6adc8',
  border: '#313244',
  hover: '#313244',
  primary: '#89b4fa',
  link: '#89b4fa',
  focus: '#89b4fa',
  accent: '#cba6f7',      // mauve - for titles
  meta: '#94e2d5',        // teal - for dates/metadata
  subtle: '#b4befe',      // lavender - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(0, 0, 0, 0.5)'
};

// Gruvbox Dark
export const gruvboxDark: ThemePalette = {
  bg: '#282828',
  bgAlt: '#3c3836',
  surface: '#504945',
  text: '#ebdbb2',
  textMuted: '#a89984',
  border: '#665c54',
  hover: '#504945',
  primary: '#458588',
  link: '#458588',
  focus: '#83a598',
  accent: '#fe8019',      // orange - for titles
  meta: '#d3869b',        // purple - for dates/metadata
  subtle: '#fabd2f',      // yellow - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(0, 0, 0, 0.5)'
};

// Gruvbox Light
export const gruvboxLight: ThemePalette = {
  bg: '#fbf1c7',
  bgAlt: '#ebdbb2',
  surface: '#d5c4a1',
  text: '#3c3836',
  textMuted: '#665c54',
  border: '#bdae93',
  hover: '#ebdbb2',
  primary: '#076678',
  link: '#076678',
  focus: '#427b58',
  accent: '#af3a03',      // orange - for titles
  meta: '#b16286',        // purple - for dates/metadata
  subtle: '#d79921',      // yellow - for decorative elements
  shadow: 'rgba(60, 56, 54, 0.1)',
  backdrop: 'rgba(60, 56, 54, 0.5)'
};

// Dracula
export const dracula: ThemePalette = {
  bg: '#282a36',
  bgAlt: '#21222c',
  surface: '#383a59',
  text: '#f8f8f2',
  textMuted: '#6272a4',
  border: '#44475a',
  hover: '#44475a',
  primary: '#bd93f9',
  link: '#8be9fd',
  focus: '#bd93f9',
  accent: '#ff79c6',      // pink - for titles
  meta: '#50fa7b',        // green - for dates/metadata
  subtle: '#bd93f9',      // purple - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.4)',
  backdrop: 'rgba(0, 0, 0, 0.6)'
};

// Nord
export const nord: ThemePalette = {
  bg: '#2e3440',
  bgAlt: '#3b4252',
  surface: '#434c5e',
  text: '#eceff4',
  textMuted: '#d8dee9',
  border: '#4c566a',
  hover: '#434c5e',
  primary: '#88c0d0',
  link: '#88c0d0',
  focus: '#5e81ac',
  accent: '#81a1c1',      // frost - for titles
  meta: '#ebcb8b',        // yellow - for dates/metadata
  subtle: '#8fbcbb',      // frost - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(46, 52, 64, 0.6)'
};

// Solarized Light
export const solarizedLight: ThemePalette = {
  bg: '#fdf6e3',        // base3
  bgAlt: '#eee8d5',     // base2
  surface: '#eee8d5',   // base2
  text: '#657b83',      // base00
  textMuted: '#586e75', // base01
  border: '#93a1a1',    // base1
  hover: '#eee8d5',     // base2
  primary: '#268bd2',   // blue
  link: '#268bd2',      // blue
  focus: '#2aa198',     // cyan
  accent: '#d33682',    // magenta - for titles
  meta: '#859900',      // green - for dates/metadata
  subtle: '#6c71c4',    // violet - for decorative elements
  shadow: 'rgba(101, 123, 131, 0.1)',
  backdrop: 'rgba(101, 123, 131, 0.5)'
};

// Solarized Dark
export const solarizedDark: ThemePalette = {
  bg: '#002b36',        // base03
  bgAlt: '#073642',     // base02
  surface: '#073642',   // base02
  text: '#839496',      // base0
  textMuted: '#586e75', // base01
  border: '#586e75',    // base01
  hover: '#073642',     // base02
  primary: '#268bd2',   // blue
  link: '#268bd2',      // blue
  focus: '#2aa198',     // cyan
  accent: '#d33682',    // magenta - for titles
  meta: '#859900',      // green - for dates/metadata
  subtle: '#6c71c4',    // violet - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.4)',
  backdrop: 'rgba(0, 43, 54, 0.6)'
};

// Everforest Dark
export const everforestDark: ThemePalette = {
  bg: '#272e33',
  bgAlt: '#2e383c',
  surface: '#374145',
  text: '#d3c6aa',
  textMuted: '#859289',
  border: '#414b50',
  hover: '#374145',
  primary: '#7fbbb3',
  link: '#7fbbb3',
  focus: '#a7c080',
  accent: '#e67e80',      // red - for titles
  meta: '#83c092',        // aqua - for dates/metadata
  subtle: '#d699b6',      // purple - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.3)',
  backdrop: 'rgba(30, 35, 38, 0.6)'
};

// Everforest Light
export const everforestLight: ThemePalette = {
  bg: '#fffbef',
  bgAlt: '#f8f5e4',
  surface: '#edeada',
  text: '#5c6a72',
  textMuted: '#829181',
  border: '#e8e5d5',
  hover: '#f2efdf',
  primary: '#3a94c5',
  link: '#3a94c5',
  focus: '#8da101',
  accent: '#f85552',      // red - for titles
  meta: '#35a77c',        // aqua - for dates/metadata
  subtle: '#df69ba',      // purple - for decorative elements
  shadow: 'rgba(92, 106, 114, 0.1)',
  backdrop: 'rgba(92, 106, 114, 0.5)'
};

// Tokyo Night
export const tokyoNight: ThemePalette = {
  bg: '#1a1b26',
  bgAlt: '#16161e',
  surface: '#24283b',
  text: '#a9b1d6',
  textMuted: '#565f89',
  border: '#292e42',
  hover: '#24283b',
  primary: '#7aa2f7',
  link: '#7aa2f7',
  focus: '#bb9af7',
  accent: '#bb9af7',      // magenta - for titles
  meta: '#9ece6a',        // green - for dates/metadata
  subtle: '#7dcfff',      // cyan - for decorative elements
  shadow: 'rgba(0, 0, 0, 0.4)',
  backdrop: 'rgba(26, 27, 38, 0.7)'
};

// Theme registry
export const themes = {
  // Catppuccin
  'catppuccin-latte': catppuccinLatte,
  'catppuccin-frappe': catppuccinFrappe,
  'catppuccin-macchiato': catppuccinMacchiato,
  'catppuccin-mocha': catppuccinMocha,

  // Gruvbox
  'gruvbox-dark': gruvboxDark,
  'gruvbox-light': gruvboxLight,

  // Other themes
  'dracula': dracula,
  'nord': nord,
  'solarized-light': solarizedLight,
  'solarized-dark': solarizedDark,
  'everforest-dark': everforestDark,
  'everforest-light': everforestLight,
  'tokyo-night': tokyoNight
} as const;

export type Theme = keyof typeof themes;

// Legacy type alias for backward compatibility
export type CatppuccinTheme = Theme;

export function getThemePalette(theme: Theme): ThemePalette {
  return themes[theme];
}
