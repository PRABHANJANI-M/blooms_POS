/** Fiery Ocean palette as JS constants (used by charts; CSS uses the @theme tokens). */
export const palette = {
  maroon: '#7B0000',
  fiery: '#C81020',
  cream: '#FFF1D6',
  navy: '#00334A',
  steel: '#669DBA',
} as const;

export const chartColors = [palette.navy, palette.steel, palette.fiery, palette.maroon, '#9bbfd1'] as const;
