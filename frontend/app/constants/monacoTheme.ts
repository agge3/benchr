export const BENCHR_THEME_NAME = 'benchr-dark';

export const BENCHR_THEME = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0a0e14',
    'editor.foreground': '#e5e9f0',
    'editorLineNumber.foreground': '#7b88a1',
    'editorCursor.foreground': '#ffeb3b',
    'editor.selectionBackground': '#2e344080',
    'editor.lineHighlightBackground': '#11151c',
  }
};

export function defineAndSetBenchrTheme(monaco: any) {
  monaco.editor.defineTheme(BENCHR_THEME_NAME, BENCHR_THEME);
  monaco.editor.setTheme(BENCHR_THEME_NAME);
}
