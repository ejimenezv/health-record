# Prompt 10: UI/UX Refinement

## Context
You are helping develop a Medical Record System MVP for a final project in the AI4Devs course. This is the ELEVENTH prompt in the series. Previous prompts completed all documentation including frontend specification.

## Prerequisites
Before proceeding, read the following files:
- `docs/product/features.md`
- `docs/product/user-flows.md`
- `docs/frontend/routing.md`
- `docs/frontend/pages/` (all page files)
- `docs/frontend/components/` (all component files)
- `docs/frontend/frontend-summary.md`

## Objective
Refine the frontend specification with detailed UI/UX considerations, including visual design, interactions, accessibility, and responsive design. This ensures a professional and usable application.

## Tasks

### 1. Define Design System
Create `docs/ui-ux/design-system.md` with:

**Color Palette**:
```css
/* Primary Colors */
--primary-50: #eff6ff;   /* Lightest blue */
--primary-100: #dbeafe;
--primary-200: #bfdbfe;
--primary-500: #3b82f6;  /* Main blue */
--primary-600: #2563eb;  /* Darker blue for hover */
--primary-700: #1d4ed8;

/* Semantic Colors */
--success: #10b981;      /* Green for success states */
--warning: #f59e0b;      /* Amber for warnings */
--error: #ef4444;        /* Red for errors */
--info: #3b82f6;         /* Blue for info */

/* Neutral Colors */
--gray-50: #f9fafb;      /* Background */
--gray-100: #f3f4f6;     /* Card backgrounds */
--gray-200: #e5e7eb;     /* Borders */
--gray-500: #6b7280;     /* Secondary text */
--gray-700: #374151;     /* Primary text */
--gray-900: #111827;     /* Headings */

/* AI Indicator Colors */
--ai-suggested: #8b5cf6; /* Purple for AI suggestions */
--ai-processing: #f59e0b;/* Amber for processing */
--ai-confirmed: #10b981; /* Green for confirmed */
```

**Typography**:
```css
/* Font Family */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

**Spacing Scale**:
```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
```

**Border Radius**:
```css
--radius-sm: 0.25rem;
--radius-md: 0.375rem;
--radius-lg: 0.5rem;
--radius-xl: 0.75rem;
--radius-full: 9999px;
```

**Shadows**:
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

### 2. Define Component Styles
Create `docs/ui-ux/component-styles.md` with:

**Buttons**:
```
Primary Button:
- Background: primary-500
- Text: white
- Padding: space-2 space-4
- Border radius: radius-md
- Hover: primary-600
- Disabled: opacity 50%, cursor not-allowed

Secondary Button:
- Background: gray-100
- Text: gray-700
- Border: 1px gray-200
- Hover: gray-200

Danger Button:
- Background: error
- Text: white
- Hover: darker red

Icon Button:
- Size: 40px x 40px
- Padding: space-2
- Border radius: radius-full
```

**Cards**:
```
Standard Card:
- Background: white
- Border: 1px gray-200
- Border radius: radius-lg
- Padding: space-6
- Shadow: shadow-sm

Hover Card (patient cards):
- Hover: shadow-md, scale 1.02
- Transition: 150ms ease-out
```

**Forms**:
```
Input:
- Height: 40px
- Padding: space-2 space-3
- Border: 1px gray-200
- Border radius: radius-md
- Focus: ring-2 primary-500

Label:
- Font size: text-sm
- Font weight: font-medium
- Color: gray-700
- Margin bottom: space-1

Error State:
- Border: 1px error
- Focus ring: error
- Error text: text-sm, error color
```

**AI Suggestion Indicator**:
```
AI Badge:
- Background: ai-suggested with 10% opacity
- Text: ai-suggested
- Border: 1px ai-suggested with 30% opacity
- Font size: text-xs
- Padding: 2px 8px
- Border radius: radius-full
- Icon: sparkles ✨

Processing Badge:
- Background: ai-processing with 10% opacity
- Animated pulse effect
```

### 3. Define Interactions & Animations
Create `docs/ui-ux/interactions.md` with:

**Page Transitions**:
```typescript
// Fade in for page content
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};
// Duration: 200ms, ease-out
```

**Loading States**:
```
Skeleton Loading:
- Use for lists and cards
- Gray-200 background
- Animated shimmer effect

Spinner:
- Primary color
- 20px for inline
- 40px for full page

Progress Bar:
- For file uploads
- Primary color fill
- Gray-200 background
```

**Micro-interactions**:
```
Button Press:
- Scale: 0.98 on active
- Duration: 100ms

Card Hover:
- Scale: 1.02
- Shadow increase
- Duration: 150ms

Form Validation:
- Shake animation on error
- Green checkmark on valid
- Duration: 300ms

AI Field Update:
- Highlight flash (purple)
- Duration: 500ms
- Fade to normal
```

**Recording Animation**:
```
Record Button:
- Pulse animation when recording
- Red color when active
- Scale oscillation 1.0 -> 1.05 -> 1.0
- Duration: 1s loop

Audio Waveform:
- Bar animation
- 5 bars, staggered heights
- Duration: 500ms loop per bar
```

**Real-time Transcription**:
```
New Text Appearance:
- Fade in new text
- Scroll to bottom automatically
- Cursor blink at end
- Duration: 200ms
```

### 4. Define Responsive Design
Create `docs/ui-ux/responsive.md` with:

**Breakpoints**:
```css
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large desktop */
```

**Layout Adaptations**:

**Mobile (< 768px)**:
```
- Sidebar hidden, accessible via hamburger menu
- Single column layouts
- Transcription panel: full screen overlay when active
- Touch-friendly: 44px minimum touch targets
- Bottom navigation for main actions
```

**Tablet (768px - 1024px)**:
```
- Collapsible sidebar
- Two-column layouts where appropriate
- Transcription panel: slide-in from right
- Adapted form layouts
```

**Desktop (> 1024px)**:
```
- Full sidebar
- Multi-column layouts
- Side-by-side transcription panel
- Full feature access
```

**Appointment Page Responsive**:
```
Desktop:
┌─────────────────────────────────────────────────────────────────┐
│ [Medical Record Form 60%]    │    [Transcription Panel 40%]    │
└─────────────────────────────────────────────────────────────────┘

Tablet:
┌─────────────────────────────────────────────────────────────────┐
│ [Medical Record Form 100%]                   [Panel Toggle] ──► │
└─────────────────────────────────────────────────────────────────┘
Panel slides in over content

Mobile:
┌──────────────────────┐
│ [Medical Record]     │
│ [Form Sections]      │
│ [Stacked]            │
├──────────────────────┤
│ [🎙 Record] [Save]   │  ← Bottom action bar
└──────────────────────┘
Transcription: Full screen overlay
```

### 5. Define Accessibility
Create `docs/ui-ux/accessibility.md` with:

**Color Contrast**:
- All text: minimum 4.5:1 contrast ratio
- Large text: minimum 3:1 contrast ratio
- Interactive elements: minimum 3:1 contrast ratio

**Keyboard Navigation**:
- All interactive elements focusable
- Visible focus indicators (ring style)
- Logical tab order
- Skip to content link
- Escape to close modals

**Screen Reader Support**:
- Semantic HTML elements
- ARIA labels for icons and buttons
- Live regions for dynamic content (transcription)
- Status announcements for AI operations

**Focus Management**:
```typescript
// After modal open: focus first input
// After modal close: return focus to trigger
// After form submit: focus on result/error
// During transcription: announce status changes
```

**Reduced Motion**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6. Define Error & Empty States
Create `docs/ui-ux/states.md` with:

**Error States**:
```
Form Validation Error:
- Red border on field
- Error message below field
- Error icon (exclamation)

API Error:
- Toast notification
- Red background
- Dismiss button
- Retry action if applicable

Connection Lost:
- Full-width banner
- Yellow/warning color
- Reconnecting indicator

Transcription Error:
- Inline error in panel
- Option to retry
- Manual entry fallback
```

**Empty States**:
```
No Patients:
- Illustration (optional for MVP)
- "No hay pacientes registrados"
- "Crear primer paciente" button

No Appointments:
- "Este paciente no tiene citas"
- "Crear nueva cita" button

No Transcription:
- "Inicia la grabación para transcribir"
- Record button prominent
```

**Loading States**:
```
Initial Page Load:
- Skeleton for layout
- Maintain header/sidebar

List Loading:
- Skeleton cards
- Staggered animation

Form Submitting:
- Button shows spinner
- Button disabled
- Form fields disabled
```

### 7. Define Notification System
Create `docs/ui-ux/notifications.md` with:

**Toast Notifications**:
```
Position: Top right
Duration: 5 seconds (auto-dismiss)
Types:
- Success: Green left border, checkmark icon
- Error: Red left border, X icon
- Warning: Yellow left border, warning icon
- Info: Blue left border, info icon

Actions:
- Dismiss button
- Optional action button (e.g., "Deshacer")
```

**In-context Notifications**:
```
AI Suggestion Applied:
- Brief tooltip showing "Campo actualizado por IA"
- Duration: 2 seconds
- Position: Near the updated field
```

### 8. Update Section 1.3 with UX Details (Spanish)
Update `docs/deliverables/section-1-producto.md` with enhanced description:

```markdown
### 1.3. Diseño y experiencia de usuario:

La aplicación está diseñada siguiendo principios de usabilidad médica, priorizando:

**Experiencia de Usuario Principal:**
1. **Inicio de Sesión**: Pantalla simple con formulario centrado
2. **Dashboard**: Vista general con accesos rápidos a pacientes recientes
3. **Gestión de Pacientes**: Lista con búsqueda y tarjetas de paciente
4. **Cita Médica**: Pantalla dividida con formulario y panel de transcripción

**Características de UX:**
- **Transcripción en tiempo real**: Panel lateral que muestra la transcripción mientras el médico habla
- **Auto-llenado con IA**: Los campos se rellenan automáticamente con indicador visual púrpura
- **Guardado automático**: Los cambios se guardan cada 30 segundos
- **Diseño responsivo**: Adaptado para tablet y escritorio

**Paleta de Colores:**
- Azul primario para acciones principales
- Verde para confirmaciones
- Púrpura para indicadores de IA
- Grises neutros para contenido

[Nota: Se incluirán capturas de pantalla tras la implementación]
```

### 9. Create UI/UX Summary
Create `docs/ui-ux/ui-ux-summary.md` with:
- Design system quick reference
- Key interaction patterns
- Responsive breakpoints
- Accessibility checklist
- Component style reference

## Output Structure
```
docs/
├── ... (previous folders)
├── ui-ux/
│   ├── design-system.md
│   ├── component-styles.md
│   ├── interactions.md
│   ├── responsive.md
│   ├── accessibility.md
│   ├── states.md
│   ├── notifications.md
│   └── ui-ux-summary.md
└── deliverables/
    └── section-1-producto.md (updated)
```

## Success Criteria
- Complete design system documented
- All component styles defined
- Interactions and animations specified
- Responsive design strategy documented
- Accessibility requirements defined
- Error and empty states defined
- Notification system defined
- Section 1.3 enhanced with UX details
- UI/UX summary created

## Next Prompt
The next prompt (11-testing-specifications.md) will define the complete testing strategy for the application.
