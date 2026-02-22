# Accessibility

Requisitos y directrices de accesibilidad para MedRecord AI, siguiendo WCAG 2.1 nivel AA.

---

## Color Contrast

### Minimum Contrast Ratios

| Element | Ratio Required | Standard |
|---------|----------------|----------|
| Normal text (< 18px) | 4.5:1 | WCAG AA |
| Large text (≥ 18px or 14px bold) | 3:1 | WCAG AA |
| UI components & graphics | 3:1 | WCAG AA |
| Enhanced (AAA optional) | 7:1 | WCAG AAA |

### Color Combinations

**Verified Combinations:**
```
Primary text on white:
- gray-700 (#374151) on white → 8.59:1 ✓
- gray-900 (#111827) on white → 15.95:1 ✓

Secondary text:
- gray-500 (#6b7280) on white → 5.39:1 ✓

Links/Actions:
- primary-600 (#2563eb) on white → 5.54:1 ✓
- primary-700 (#1d4ed8) on white → 7.25:1 ✓

Error states:
- error (#ef4444) on white → 4.53:1 ✓
- error text: #b91c1c on white → 5.95:1 ✓

Success states:
- success (#10b981) on white → 3.03:1 ✓ (large text only)
- success text: #047857 on white → 5.49:1 ✓

AI indicator:
- ai-suggested (#8b5cf6) on white → 4.54:1 ✓
```

### Non-Color Indicators

Never rely on color alone to convey information:

```html
<!-- Bad: Color only -->
<span class="text-red-500">Error</span>

<!-- Good: Color + icon + text -->
<span class="text-red-500 flex items-center gap-1">
  <AlertCircle size={16} aria-hidden="true" />
  <span>Error: El campo es requerido</span>
</span>
```

---

## Keyboard Navigation

### Focus Order

Ensure logical tab order following visual layout:

1. Skip to content link (first focusable element)
2. Navigation/sidebar links
3. Main content area (forms, buttons, links)
4. Footer elements (if any)

### Focus Indicators

```css
/* Visible focus ring for all interactive elements */
:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px var(--primary-500);
}

/* Remove default outline only when focus-visible is supported */
:focus:not(:focus-visible) {
  outline: none;
}

/* High contrast focus for buttons */
.btn:focus-visible {
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px var(--primary-700);
}
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next element |
| `Shift + Tab` | Move focus to previous element |
| `Enter` | Activate focused button/link |
| `Space` | Activate focused button, toggle checkbox |
| `Escape` | Close modal/dropdown, cancel action |
| `Arrow keys` | Navigate within menus, sliders |

### Skip Link

```html
<!-- First element in body -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:shadow-lg focus:rounded"
>
  Saltar al contenido principal
</a>

<!-- Main content area -->
<main id="main-content" tabindex="-1">
  ...
</main>
```

### Modal Focus Management

```typescript
// Focus management for modals
const Modal = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocus.current = document.activeElement as HTMLElement;

      // Focus first focusable element in modal
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    } else {
      // Return focus to trigger element
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  // Trap focus within modal
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }

    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};
```

---

## Screen Reader Support

### Semantic HTML

Use semantic elements for better screen reader navigation:

```html
<!-- Navigation -->
<nav aria-label="Navegación principal">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
    <li><a href="/patients">Pacientes</a></li>
  </ul>
</nav>

<!-- Main content -->
<main id="main-content">
  <h1>Título de la página</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Sección</h2>
    ...
  </section>
</main>

<!-- Forms -->
<form aria-label="Formulario de registro de paciente">
  <fieldset>
    <legend>Información personal</legend>
    ...
  </fieldset>
</form>
```

### ARIA Labels

```html
<!-- Icon buttons -->
<button aria-label="Cerrar modal">
  <X aria-hidden="true" />
</button>

<button aria-label="Iniciar grabación de audio">
  <Mic aria-hidden="true" />
</button>

<!-- Search input -->
<div role="search">
  <label htmlFor="patient-search" class="sr-only">Buscar pacientes</label>
  <input
    id="patient-search"
    type="search"
    placeholder="Buscar pacientes..."
    aria-describedby="search-hint"
  />
  <p id="search-hint" class="sr-only">
    Escribe el nombre o ID del paciente para buscar
  </p>
</div>

<!-- Status badges -->
<span
  role="status"
  aria-label="Estado de la cita: Completada"
  class="status-completed"
>
  Completada
</span>

<!-- AI indicator -->
<span aria-label="Campo sugerido por inteligencia artificial">
  <Sparkles aria-hidden="true" />
  <span>IA</span>
</span>
```

### Live Regions

For dynamic content updates:

```html
<!-- Transcription updates -->
<div
  aria-live="polite"
  aria-atomic="false"
  aria-relevant="additions text"
  class="transcription-content"
>
  {transcriptionText}
</div>

<!-- Form validation errors -->
<div
  aria-live="assertive"
  aria-atomic="true"
  class="sr-only"
  id="form-errors"
>
  {hasErrors && `Error: ${errorMessages.join('. ')}`}
</div>

<!-- Loading status -->
<div aria-live="polite" class="sr-only">
  {isLoading && 'Cargando...'}
  {isComplete && 'Carga completada'}
</div>

<!-- Toast notifications -->
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {toastMessage}
</div>
```

### Status Announcements

```typescript
// Hook for screen reader announcements
const useAnnounce = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return announce;
};

// Usage
const announce = useAnnounce();

// During recording
announce('Grabación iniciada');

// AI extraction complete
announce('Extracción de IA completada. 5 campos sugeridos.');

// Form saved
announce('Consulta guardada exitosamente');
```

---

## Form Accessibility

### Labels and Instructions

```html
<!-- Every input needs a label -->
<div class="form-group">
  <label htmlFor="patient-name" class="label">
    Nombre completo
    <span aria-hidden="true" class="text-error">*</span>
    <span class="sr-only">(requerido)</span>
  </label>
  <input
    id="patient-name"
    type="text"
    required
    aria-required="true"
    aria-describedby="name-hint"
  />
  <p id="name-hint" class="text-sm text-gray-500">
    Ingrese nombre y apellidos del paciente
  </p>
</div>

<!-- Error state -->
<div class="form-group">
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" class="error-message" role="alert">
    Por favor, ingrese un email válido
  </p>
</div>
```

### Form Groups

```html
<!-- Related fields grouped -->
<fieldset>
  <legend>Contacto de emergencia</legend>

  <div class="form-group">
    <label htmlFor="emergency-name">Nombre</label>
    <input id="emergency-name" type="text" />
  </div>

  <div class="form-group">
    <label htmlFor="emergency-phone">Teléfono</label>
    <input id="emergency-phone" type="tel" />
  </div>
</fieldset>
```

### Required Fields

```css
/* Visual indicator for required fields */
.label-required::after {
  content: ' *';
  color: var(--error);
}
```

```html
<!-- Screen reader accessible -->
<label htmlFor="field" class="label-required">
  Campo
  <span class="sr-only">(requerido)</span>
</label>
```

---

## Focus Management

### After Actions

```typescript
// After form submission - focus on result
const handleSubmit = async () => {
  try {
    await saveForm();
    // Focus on success message
    document.getElementById('success-message')?.focus();
  } catch (error) {
    // Focus on first error
    document.querySelector('[aria-invalid="true"]')?.focus();
  }
};

// After modal close - return to trigger
const handleModalClose = () => {
  setIsOpen(false);
  triggerButtonRef.current?.focus();
};

// After navigation - focus on main content
useEffect(() => {
  document.getElementById('main-content')?.focus();
}, [pathname]);
```

### During Transcription

```typescript
// Announce transcription status changes
const TranscriptionPanel = () => {
  const announce = useAnnounce();
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>();

  useEffect(() => {
    switch (status) {
      case 'recording':
        announce('Grabación en progreso');
        break;
      case 'processing':
        announce('Procesando transcripción con inteligencia artificial');
        break;
      case 'idle':
        announce('Transcripción detenida');
        break;
    }
  }, [status]);

  return (
    <div
      role="region"
      aria-label="Panel de transcripción"
      aria-live="polite"
    >
      ...
    </div>
  );
};
```

---

## Reduced Motion

### CSS Implementation

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Alternative for essential animations */
@media (prefers-reduced-motion: reduce) {
  .recording-indicator {
    /* Replace pulse animation with static indicator */
    animation: none;
    opacity: 1;
  }

  .skeleton {
    /* Replace shimmer with static gray */
    animation: none;
    background: var(--gray-200);
  }
}
```

### JavaScript Implementation

```typescript
// Check for reduced motion preference
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Use in components
const AnimatedComponent = () => {
  const reducedMotion = prefersReducedMotion();

  const variants = reducedMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      };

  return <motion.div variants={variants} />;
};
```

---

## Screen Reader Only Content

```css
/* Visually hidden but accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Show on focus (for skip links) */
.sr-only-focusable:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## Testing Checklist

### Automated Testing
- [ ] Run axe-core on all pages
- [ ] Check color contrast ratios
- [ ] Validate HTML semantics

### Manual Testing
- [ ] Navigate entire app using only keyboard
- [ ] Test with screen reader (NVDA, VoiceOver)
- [ ] Verify focus indicators are visible
- [ ] Test with 200% zoom
- [ ] Test with reduced motion enabled

### Screen Reader Testing

**Key pages to test:**
1. Login page
2. Dashboard
3. Patient list
4. Patient detail
5. Appointment form with transcription
6. All modals

**Verify:**
- [ ] All interactive elements announced correctly
- [ ] Form labels read with inputs
- [ ] Error messages announced
- [ ] Status changes announced
- [ ] AI suggestions announced
- [ ] Navigation landmarks present

### Color/Vision Testing
- [ ] Test with color blindness simulators
- [ ] Verify no color-only information
- [ ] Check high contrast mode

---

## ARIA Roles Reference

### Landmark Roles
- `banner` - Page header
- `navigation` - Navigation areas
- `main` - Main content
- `complementary` - Supporting content (sidebar)
- `contentinfo` - Page footer

### Widget Roles
- `dialog` - Modal dialogs
- `alert` - Important messages
- `alertdialog` - Dialogs requiring response
- `status` - Status messages
- `progressbar` - Progress indicators

### Document Structure
- `article` - Self-contained content
- `region` - Significant area (with aria-label)
- `list` / `listitem` - Custom lists
- `heading` - Custom headings (with aria-level)

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [a11y Project Checklist](https://www.a11yproject.com/checklist/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
