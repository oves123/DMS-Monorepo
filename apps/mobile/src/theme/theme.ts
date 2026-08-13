// ============================================================
// Centralized Theme Engine for Cashmitra DMS Mobile App
// Change colors here to re-brand the entire app.
// ============================================================

export const colors = {
  // Brand
  primary: '#2563eb',
  primaryLight: '#dbeafe',
  primaryDark: '#1d4ed8',

  // Status
  success: '#10b981',
  successLight: '#dcfce7',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  danger: '#ef4444',
  dangerLight: '#fee2e2',
  info: '#8b5cf6',
  infoLight: '#ede9fe',

  // Neutrals
  white: '#ffffff',
  background: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',

  // Skeleton
  skeletonBase: '#e2e8f0',
  skeletonHighlight: '#f8fafc',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};

export default { colors, spacing, radii, typography, shadows };
