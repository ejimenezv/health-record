# UI Components Specification

## Overview

This document specifies the base UI components used throughout MedRecord AI. The application uses **shadcn/ui** as the component library, built on top of Radix UI primitives and styled with Tailwind CSS.

## Component Library: shadcn/ui

### Why shadcn/ui?
- Copy-paste components (own the code)
- Built on Radix UI primitives (accessibility)
- Tailwind CSS styling (consistency)
- TypeScript support
- Easy customization

### Installation
Components are installed individually as needed:
```bash
npx shadcn-ui@latest add button input card ...
```

## Required Components

### Form Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `Button` | Actions, submits | Multiple variants |
| `Input` | Text fields | With error states |
| `Textarea` | Multi-line text | Character count |
| `Select` | Dropdowns | With search (optional) |
| `Checkbox` | Boolean options | - |
| `RadioGroup` | Single selection | For gender, etc. |
| `Switch` | Toggles | For preferences |
| `Slider` | Severity (1-10) | For symptoms |
| `DatePicker` | Date selection | Custom or shadcn |
| `Form` | Form wrapper | react-hook-form integration |
| `Label` | Field labels | Required indicator |

### Layout Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `Card` | Content containers | Multiple variants |
| `Separator` | Section dividers | - |
| `Tabs` | Section switching | Patient detail tabs |
| `ScrollArea` | Scrollable regions | Transcription panel |

### Feedback Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `Alert` | Error/warning messages | Multiple variants |
| `AlertDialog` | Confirmations | Delete, unsaved changes |
| `Dialog` | Modals | Forms, details |
| `Toast` | Notifications | Success, error |
| `Skeleton` | Loading states | Various shapes |
| `Progress` | Loading indicators | AI processing |

### Navigation Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `NavigationMenu` | Top nav | - |
| `Breadcrumb` | Page trail | Custom implementation |
| `DropdownMenu` | User menu | Logout, settings |

### Data Display Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `Badge` | Status indicators | AI badge, status |
| `Avatar` | User/patient icons | Initials fallback |
| `Table` | Data tables | Optional for lists |
| `Tooltip` | Help text | Field hints |

## Theme Configuration

### Colors

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary - Medical blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Secondary - Neutral gray
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
        },
        // Success - Green
        success: {
          50: '#ecfdf5',
          500: '#22c55e',
          600: '#16a34a',
        },
        // Warning - Yellow
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Error - Red
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        // AI indicator - Purple
        ai: {
          50: '#faf5ff',
          500: '#a855f7',
          600: '#9333ea',
        },
      },
    },
  },
};
```

### Typography

```typescript
// Font family
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}

// Font sizes (Tailwind defaults)
// text-xs: 12px
// text-sm: 14px
// text-base: 16px
// text-lg: 18px
// text-xl: 20px
// text-2xl: 24px
```

### Spacing

Standard Tailwind spacing scale (4px base unit).

### Border Radius

```typescript
borderRadius: {
  DEFAULT: '0.5rem',  // 8px
  sm: '0.375rem',     // 6px
  lg: '0.75rem',      // 12px
  full: '9999px',
}
```

### Shadows

```typescript
boxShadow: {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}
```

## Component Variants

### Button Variants

```typescript
// Button.tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
        destructive: 'bg-error-600 text-white hover:bg-error-700',
        outline: 'border border-secondary-300 bg-white hover:bg-secondary-50',
        ghost: 'hover:bg-secondary-100',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

### Input States

```css
/* Base input */
.input {
  @apply h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm;
  @apply placeholder:text-secondary-400;
  @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  @apply disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary-50;
}

/* Error state */
.input-error {
  @apply border-error-500 focus:ring-error-500;
}

/* With icon */
.input-with-icon {
  @apply pl-10;
}
```

### Badge Variants

```typescript
// Badge.tsx
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-secondary-100 text-secondary-800',
        primary: 'bg-primary-100 text-primary-800',
        success: 'bg-success-100 text-success-800',
        warning: 'bg-warning-100 text-warning-800',
        error: 'bg-error-100 text-error-800',
        ai: 'bg-ai-100 text-ai-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
```

### Card Variants

```typescript
// Card.tsx
const cardVariants = cva('rounded-lg border bg-white', {
  variants: {
    variant: {
      default: 'border-secondary-200 shadow-sm',
      elevated: 'border-secondary-100 shadow-md',
      interactive: 'border-secondary-200 shadow-sm hover:shadow-md hover:border-secondary-300 cursor-pointer transition-all',
    },
    padding: {
      none: '',
      sm: 'p-4',
      default: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});
```

## Custom Components

### AIBadge

```typescript
// components/ui/AIBadge.tsx

interface AIBadgeProps {
  accepted?: boolean;
  onClick?: () => void;
}

export const AIBadge: React.FC<AIBadgeProps> = ({ accepted, onClick }) => (
  <Badge
    variant="ai"
    className={cn(
      'cursor-pointer transition-colors',
      accepted && 'bg-ai-500 text-white'
    )}
    onClick={onClick}
  >
    AI {accepted ? '✓' : '?'}
  </Badge>
);
```

### StatusBadge

```typescript
// components/ui/StatusBadge.tsx

interface StatusBadgeProps {
  status: AppointmentStatus;
}

const statusConfig = {
  scheduled: { label: 'Programada', variant: 'primary' },
  checked_in: { label: 'Registrado', variant: 'warning' },
  in_progress: { label: 'En Progreso', variant: 'warning' },
  completed: { label: 'Completada', variant: 'success' },
  cancelled: { label: 'Cancelada', variant: 'default' },
  no_show: { label: 'No Asistió', variant: 'error' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

### LoadingSpinner

```typescript
// components/ui/LoadingSpinner.tsx

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-secondary-200 border-t-primary-600',
        sizeClasses[size]
      )}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80">
        {spinner}
      </div>
    );
  }

  return spinner;
};
```

### EmptyState

```typescript
// components/ui/EmptyState.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="mb-4 text-secondary-400">{icon}</div>}
    <h3 className="text-lg font-medium text-secondary-900">{title}</h3>
    {description && (
      <p className="mt-1 text-sm text-secondary-500">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
```

## Icon Library

Using **Lucide React** for icons:

```bash
npm install lucide-react
```

### Common Icons

```typescript
import {
  // Navigation
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,

  // Actions
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  Search,

  // Medical
  Mic,
  MicOff,
  FileText,
  Pill,
  Stethoscope,

  // Status
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,

  // User
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
```

## Accessibility Standards

### Focus Management
- Visible focus rings on all interactive elements
- Focus trapped in modals
- Focus returned to trigger on modal close

### Color Contrast
- All text meets WCAG 2.1 AA standards
- 4.5:1 for normal text
- 3:1 for large text

### Screen Reader Support
- Proper ARIA labels
- Live regions for dynamic content
- Skip links for navigation

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order
- Escape closes modals/dropdowns

## Responsive Breakpoints

```typescript
// Tailwind defaults
screens: {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

## Component File Structure

```
src/components/ui/
├── button.tsx
├── input.tsx
├── textarea.tsx
├── select.tsx
├── checkbox.tsx
├── radio-group.tsx
├── switch.tsx
├── slider.tsx
├── form.tsx
├── label.tsx
├── card.tsx
├── separator.tsx
├── tabs.tsx
├── scroll-area.tsx
├── alert.tsx
├── alert-dialog.tsx
├── dialog.tsx
├── toast.tsx
├── skeleton.tsx
├── progress.tsx
├── breadcrumb.tsx
├── dropdown-menu.tsx
├── badge.tsx
├── avatar.tsx
├── table.tsx
├── tooltip.tsx
├── ai-badge.tsx
├── status-badge.tsx
├── loading-spinner.tsx
├── empty-state.tsx
└── index.ts          # Re-exports all components
```
