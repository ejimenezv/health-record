# UI/UX Summary

Resumen ejecutivo del sistema de diseño y especificaciones de UX para MedRecord AI.

---

## Quick Reference

### Design System Files

| File | Contents |
|------|----------|
| [design-system.md](./design-system.md) | Colors, typography, spacing, shadows, z-index |
| [component-styles.md](./component-styles.md) | Buttons, cards, forms, badges, navigation |
| [interactions.md](./interactions.md) | Animations, transitions, micro-interactions |
| [responsive.md](./responsive.md) | Breakpoints, layouts, mobile adaptations |
| [accessibility.md](./accessibility.md) | WCAG compliance, keyboard nav, screen readers |
| [states.md](./states.md) | Error, empty, and loading states |
| [notifications.md](./notifications.md) | Toasts, alerts, feedback system |

---

## Color Palette Quick Reference

### Primary Colors
```css
--primary-500: #3b82f6;  /* Main blue */
--primary-600: #2563eb;  /* Hover */
--primary-700: #1d4ed8;  /* Active */
```

### Semantic Colors
```css
--success: #10b981;      /* Green */
--warning: #f59e0b;      /* Amber */
--error: #ef4444;        /* Red */
--info: #3b82f6;         /* Blue */
```

### AI Colors
```css
--ai-suggested: #8b5cf6; /* Purple */
--ai-processing: #f59e0b;/* Amber */
--ai-confirmed: #10b981; /* Green */
```

### Neutrals
```css
--gray-50: #f9fafb;      /* Background */
--gray-200: #e5e7eb;     /* Borders */
--gray-500: #6b7280;     /* Secondary text */
--gray-700: #374151;     /* Primary text */
--gray-900: #111827;     /* Headings */
```

---

## Typography Quick Reference

| Element | Size | Weight | Use |
|---------|------|--------|-----|
| Page Title | 30px (text-3xl) | Bold | Main headings |
| Section Title | 24px (text-2xl) | Semibold | Section headers |
| Card Title | 18px (text-lg) | Semibold | Card headers |
| Body | 16px (text-base) | Normal | Default text |
| Secondary | 14px (text-sm) | Normal | Secondary info |
| Caption | 12px (text-xs) | Normal | Labels, badges |

**Font:** Inter (sans-serif), JetBrains Mono (monospace)

---

## Spacing Scale

```
4px   (space-1)  - Tight spacing
8px   (space-2)  - Default gap
16px  (space-4)  - Form field spacing
24px  (space-6)  - Card padding
32px  (space-8)  - Section spacing
```

---

## Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| Mobile | < 768px | Single column, hamburger menu |
| Tablet | 768-1024px | Collapsible sidebar, 2 columns |
| Desktop | > 1024px | Full sidebar, multi-column |

---

## Key Component Styles

### Buttons

| Variant | Background | Text | Use |
|---------|------------|------|-----|
| Primary | primary-500 | white | Main actions |
| Secondary | gray-100 | gray-700 | Alternative actions |
| Danger | error | white | Destructive actions |
| Ghost | transparent | gray-700 | Subtle actions |

**Size:** 40px height (default), 32px (sm), 48px (lg)

### Cards

```css
Standard Card:
- Background: white
- Border: 1px gray-200
- Radius: 8px (radius-lg)
- Padding: 24px (space-6)
- Shadow: shadow-sm
```

### Inputs

```css
- Height: 40px
- Border: 1px gray-200
- Radius: 6px (radius-md)
- Focus: ring-2 primary-500
- Error: border error + red ring
```

### AI Indicator Badge

```css
- Background: purple 10% opacity
- Text: ai-suggested (#8b5cf6)
- Border: purple 30% opacity
- Radius: full (pill shape)
- Icon: Sparkles ✨
```

---

## Key Interaction Patterns

### Page Transitions
- Fade in + slide up (200ms, ease-out)

### Button Interactions
- Hover: background color change (150ms)
- Active: scale 0.98 (100ms)

### Card Hover
- Scale: 1.02
- Shadow: increase to shadow-md
- Duration: 150ms

### Recording Animation
- Pulse animation (1s loop)
- Scale: 1.0 → 1.05 → 1.0
- Red color when active

### AI Field Update
- Purple highlight flash (500ms)
- Fade to transparent

### Skeleton Loading
- Shimmer animation (1.5s loop)
- Gray-200 → Gray-100 → Gray-200

---

## Responsive Layout Summary

### Mobile (< 768px)
```
┌────────────────────┐
│ ☰  Header      👤  │
├────────────────────┤
│                    │
│  Single Column     │
│  Content           │
│                    │
├────────────────────┤
│ [Bottom Actions]   │
└────────────────────┘
```

### Desktop (> 1024px)
```
┌─────────────┬────────────────────────────────────┐
│             │ Header                              │
│  Sidebar    ├────────────────────────────────────┤
│             │                                    │
│  Navigation │    Multi-column Content            │
│             │                                    │
└─────────────┴────────────────────────────────────┘
```

### Appointment Page
```
Desktop:       [Form 60%]  │  [Transcription 40%]
Tablet:        [Form 100%] + [Slide-in Panel]
Mobile:        [Form] + [Fullscreen Overlay]
```

---

## Accessibility Checklist

### Color & Contrast
- [ ] Text contrast ≥ 4.5:1
- [ ] Large text contrast ≥ 3:1
- [ ] No color-only information

### Keyboard
- [ ] All elements focusable
- [ ] Visible focus indicators
- [ ] Logical tab order
- [ ] Escape closes modals

### Screen Readers
- [ ] Semantic HTML
- [ ] ARIA labels on icons/buttons
- [ ] Live regions for updates
- [ ] Status announcements

### Motion
- [ ] Reduced motion support
- [ ] No seizure-inducing content

---

## State Patterns

### Empty State
```
┌─────────────────────────────────┐
│                                 │
│           [Icon]                │
│                                 │
│      Title text here            │
│                                 │
│   Description explaining        │
│   what to do next               │
│                                 │
│       [Action Button]           │
│                                 │
└─────────────────────────────────┘
```

### Error State (Form)
```
┌─────────────────────────────────┐
│ Label *                         │
│ ┌─────────────────────────────┐ │
│ │ Invalid input             │ │ ← Red border
│ └─────────────────────────────┘ │
│ ⚠ Error message here           │ ← Red text
└─────────────────────────────────┘
```

### Loading State
```
Skeleton cards:
┌────────────────┐
│ ██████████████ │  ← Shimmer animation
│ ████████       │
│ ██████         │
└────────────────┘
```

---

## Notification Types

| Type | Color | Duration | Use |
|------|-------|----------|-----|
| Success | Green | 5s | Confirmations |
| Error | Red | Persistent | Errors |
| Warning | Amber | 5-7s | Cautions |
| Info | Blue | 5s | Information |

**Position:** Top-right, stacked (max 3)

---

## Key UX Decisions

### AI Integration
- Human-in-the-loop: All AI suggestions require explicit confirmation
- Visual distinction: Purple color for AI-suggested fields
- Source transparency: Side-by-side transcription for verification

### Forms
- Real-time validation on blur
- Auto-save every 30 seconds
- Required fields marked with *

### Navigation
- Breadcrumbs for context
- Sticky header
- Collapsible sidebar

### Feedback
- Immediate visual feedback for all actions
- Loading states for async operations
- Clear error messages in Spanish

---

## Implementation Notes

### Technology Stack
- **UI Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui (Radix primitives)
- **Animations:** Framer Motion (optional)
- **Icons:** Lucide React

### Key Libraries
```json
{
  "tailwindcss": "^3.x",
  "@radix-ui/react-*": "latest",
  "lucide-react": "^0.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x"
}
```

### CSS Custom Properties
All design tokens are defined as CSS custom properties for easy theming and consistency. Reference `design-system.md` for the complete list.

---

## Documentation Index

For detailed specifications, refer to:

1. **Colors & Typography** → [design-system.md](./design-system.md)
2. **Component Styling** → [component-styles.md](./component-styles.md)
3. **Animations** → [interactions.md](./interactions.md)
4. **Mobile/Tablet Layouts** → [responsive.md](./responsive.md)
5. **WCAG Compliance** → [accessibility.md](./accessibility.md)
6. **Error/Empty/Loading** → [states.md](./states.md)
7. **Toast/Alerts** → [notifications.md](./notifications.md)
