# Design System

Sistema de diseño para MedRecord AI, definiendo tokens visuales que garantizan consistencia en toda la aplicación.

## Color Palette

### Primary Colors (Medical Blue)
```css
/* Primary Colors - Used for main actions and branding */
--primary-50: #eff6ff;   /* Lightest blue - backgrounds */
--primary-100: #dbeafe;  /* Light blue - hover states */
--primary-200: #bfdbfe;  /* Soft blue - borders */
--primary-500: #3b82f6;  /* Main blue - primary actions */
--primary-600: #2563eb;  /* Darker blue - hover states */
--primary-700: #1d4ed8;  /* Dark blue - active states */
```

### Semantic Colors
```css
/* Semantic Colors - Used for status and feedback */
--success: #10b981;      /* Green - success states, confirmations */
--warning: #f59e0b;      /* Amber - warnings, caution states */
--error: #ef4444;        /* Red - errors, destructive actions */
--info: #3b82f6;         /* Blue - informational messages */
```

### Neutral Colors
```css
/* Neutral Colors - Used for text, backgrounds, borders */
--gray-50: #f9fafb;      /* Page background */
--gray-100: #f3f4f6;     /* Card backgrounds, alternating rows */
--gray-200: #e5e7eb;     /* Borders, dividers */
--gray-300: #d1d5db;     /* Disabled states */
--gray-400: #9ca3af;     /* Placeholder text */
--gray-500: #6b7280;     /* Secondary text, icons */
--gray-700: #374151;     /* Primary text */
--gray-900: #111827;     /* Headings, emphasis */
```

### AI Indicator Colors
```css
/* AI Indicator Colors - Used for AI-related features */
--ai-suggested: #8b5cf6; /* Purple - AI suggestions pending review */
--ai-processing: #f59e0b;/* Amber - AI processing in progress */
--ai-confirmed: #10b981; /* Green - AI suggestion confirmed */

/* AI Background Variants */
--ai-suggested-bg: rgba(139, 92, 246, 0.1);  /* 10% opacity for backgrounds */
--ai-processing-bg: rgba(245, 158, 11, 0.1);
--ai-confirmed-bg: rgba(16, 185, 129, 0.1);
```

### Medical Status Colors
```css
/* Appointment Status */
--status-scheduled: #3b82f6;   /* Blue */
--status-checked-in: #f59e0b;  /* Amber */
--status-in-progress: #8b5cf6; /* Purple */
--status-completed: #10b981;   /* Green */
--status-cancelled: #6b7280;   /* Gray */
--status-no-show: #ef4444;     /* Red */

/* Severity Indicators */
--severity-mild: #22c55e;      /* Green */
--severity-moderate: #f59e0b;  /* Amber */
--severity-severe: #ef4444;    /* Red */
```

---

## Typography

### Font Family
```css
/* Font Stack */
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### Font Sizes
```css
/* Font Sizes - Using rem for accessibility */
--text-xs: 0.75rem;    /* 12px - Labels, badges, captions */
--text-sm: 0.875rem;   /* 14px - Secondary text, form labels */
--text-base: 1rem;     /* 16px - Body text, inputs */
--text-lg: 1.125rem;   /* 18px - Emphasized body text */
--text-xl: 1.25rem;    /* 20px - Small headings */
--text-2xl: 1.5rem;    /* 24px - Section headings */
--text-3xl: 1.875rem;  /* 30px - Page titles */
--text-4xl: 2.25rem;   /* 36px - Hero headings */
```

### Font Weights
```css
/* Font Weights */
--font-normal: 400;    /* Body text */
--font-medium: 500;    /* Labels, subtle emphasis */
--font-semibold: 600;  /* Buttons, headings */
--font-bold: 700;      /* Strong emphasis */
```

### Line Heights
```css
/* Line Heights */
--leading-none: 1;       /* Single line elements */
--leading-tight: 1.25;   /* Headings */
--leading-snug: 1.375;   /* Compact text */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.625;/* Readable paragraphs */
--leading-loose: 2;      /* Spacious text */
```

### Typography Usage

| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| Page Title | text-3xl | bold | tight | gray-900 |
| Section Heading | text-2xl | semibold | tight | gray-900 |
| Card Title | text-lg | semibold | tight | gray-900 |
| Body Text | text-base | normal | normal | gray-700 |
| Secondary Text | text-sm | normal | normal | gray-500 |
| Label | text-sm | medium | normal | gray-700 |
| Caption | text-xs | normal | normal | gray-500 |
| Badge | text-xs | medium | none | varies |

---

## Spacing Scale

```css
/* Spacing Scale - 4px base unit */
--space-0: 0;
--space-px: 1px;
--space-0.5: 0.125rem;  /* 2px */
--space-1: 0.25rem;     /* 4px */
--space-1.5: 0.375rem;  /* 6px */
--space-2: 0.5rem;      /* 8px */
--space-2.5: 0.625rem;  /* 10px */
--space-3: 0.75rem;     /* 12px */
--space-3.5: 0.875rem;  /* 14px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-7: 1.75rem;     /* 28px */
--space-8: 2rem;        /* 32px */
--space-9: 2.25rem;     /* 36px */
--space-10: 2.5rem;     /* 40px */
--space-11: 2.75rem;    /* 44px */
--space-12: 3rem;       /* 48px */
--space-14: 3.5rem;     /* 56px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
--space-24: 6rem;       /* 96px */
```

### Spacing Guidelines

| Context | Spacing |
|---------|---------|
| Between related elements | space-2 to space-3 |
| Between form fields | space-4 |
| Card internal padding | space-6 |
| Between cards | space-4 to space-6 |
| Page sections | space-8 to space-12 |
| Page margins (mobile) | space-4 |
| Page margins (desktop) | space-6 to space-8 |

---

## Border Radius

```css
/* Border Radius Scale */
--radius-none: 0;
--radius-sm: 0.125rem;   /* 2px - Subtle rounding */
--radius-default: 0.25rem; /* 4px - Small elements */
--radius-md: 0.375rem;   /* 6px - Buttons, inputs */
--radius-lg: 0.5rem;     /* 8px - Cards, modals */
--radius-xl: 0.75rem;    /* 12px - Large cards */
--radius-2xl: 1rem;      /* 16px - Feature sections */
--radius-3xl: 1.5rem;    /* 24px - Hero elements */
--radius-full: 9999px;   /* Circular - Avatars, badges */
```

### Border Radius Usage

| Element | Radius |
|---------|--------|
| Buttons | radius-md |
| Inputs | radius-md |
| Cards | radius-lg |
| Modals | radius-xl |
| Badges | radius-full |
| Avatars | radius-full |
| Tooltips | radius-md |

---

## Shadows

```css
/* Shadow Scale */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
--shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
--shadow-none: 0 0 #0000;

/* Focus Ring */
--ring-offset: 2px;
--ring-width: 2px;
--ring-color: var(--primary-500);
```

### Shadow Usage

| Element | Shadow |
|---------|--------|
| Cards (default) | shadow-sm |
| Cards (hover) | shadow-md |
| Dropdowns | shadow-lg |
| Modals | shadow-xl |
| Tooltips | shadow-md |
| Inputs (focus) | ring |

---

## Z-Index Scale

```css
/* Z-Index Scale */
--z-auto: auto;
--z-0: 0;
--z-10: 10;      /* Base elevated elements */
--z-20: 20;      /* Sticky headers */
--z-30: 30;      /* Fixed sidebar */
--z-40: 40;      /* Dropdowns, tooltips */
--z-50: 50;      /* Modals, dialogs */
--z-60: 60;      /* Toast notifications */
--z-max: 9999;   /* Maximum priority */
```

### Z-Index Usage

| Element | Z-Index |
|---------|---------|
| Base content | z-0 |
| Sticky elements | z-20 |
| Sidebar | z-30 |
| Dropdown menus | z-40 |
| Tooltips | z-40 |
| Modal backdrop | z-50 |
| Modal content | z-50 |
| Toasts | z-60 |

---

## Transitions

```css
/* Transition Durations */
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;

/* Transition Timing Functions */
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Common Transitions */
--transition-colors: color, background-color, border-color, text-decoration-color, fill, stroke;
--transition-opacity: opacity;
--transition-shadow: box-shadow;
--transition-transform: transform;
--transition-all: all;
```

### Transition Guidelines

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button hover | 150ms | ease-out |
| Card hover | 200ms | ease-out |
| Modal open | 200ms | ease-out |
| Modal close | 150ms | ease-in |
| Page transition | 200ms | ease-out |
| Micro-interaction | 100ms | ease-out |

---

## Iconography

### Icon Library
Usar **Lucide React** como biblioteca de iconos principal.

### Icon Sizes
```css
--icon-xs: 12px;   /* Inline with small text */
--icon-sm: 16px;   /* Inline with body text */
--icon-md: 20px;   /* Buttons, inputs */
--icon-lg: 24px;   /* Navigation, headers */
--icon-xl: 32px;   /* Feature icons */
--icon-2xl: 48px;  /* Empty states */
```

### Common Icons

| Purpose | Icon | Context |
|---------|------|---------|
| Dashboard | `LayoutDashboard` | Navigation |
| Patients | `Users` | Navigation |
| Calendar | `Calendar` | Appointments |
| Record | `Mic` | Recording |
| Stop | `Square` | Stop recording |
| AI/Magic | `Sparkles` | AI indicators |
| Check | `Check` | Success, confirm |
| X/Close | `X` | Close, cancel |
| Alert | `AlertCircle` | Warnings |
| Info | `Info` | Information |
| Edit | `Pencil` | Edit action |
| Delete | `Trash2` | Delete action |
| Search | `Search` | Search input |
| Add | `Plus` | Add new |
| Settings | `Settings` | Settings |
| Logout | `LogOut` | User menu |
| Heart | `Heart` | Vital signs |
| Stethoscope | `Stethoscope` | Medical context |

---

## Design Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        ai: {
          suggested: '#8b5cf6',
          processing: '#f59e0b',
          confirmed: '#10b981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'ai-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ai-highlight': 'ai-highlight 0.5s ease-out',
      },
      keyframes: {
        'ai-highlight': {
          '0%': { backgroundColor: 'rgba(139, 92, 246, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
};
```
