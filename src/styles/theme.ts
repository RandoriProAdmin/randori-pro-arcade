export const colors = {
  dunkelrot: '#6d1723',
  rotHell: '#dc0d1d',
  rotMittel: '#aa1a1d',
  beige: '#d4c9b5',
  grau: '#575e62',
  hellgrau: '#f3f3f3',
  weiss: '#ffffff',
  schwarz: '#1a1a1a',
} as const;

export const beltColors = [
  { name: 'Weiß', hex: '#ffffff' },
  { name: 'Gelb', hex: '#f5d142' },
  { name: 'Orange', hex: '#e8852a' },
  { name: 'Grün', hex: '#3a8a3a' },
  { name: 'Blau', hex: '#1d4ed8' },
  { name: 'Braun', hex: '#6b3a1a' },
  { name: 'Schwarz', hex: '#1a1a1a' },
] as const;

export type BeltName = (typeof beltColors)[number]['name'];
