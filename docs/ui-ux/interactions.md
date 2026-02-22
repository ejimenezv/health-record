# Interactions & Animations

Especificación de interacciones, animaciones y micro-interacciones para MedRecord AI.

---

## Page Transitions

### Default Page Transition
```typescript
// Page fade and slide animation
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  }
};

// Usage with framer-motion
<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
>
  {children}
</motion.div>
```

### List Item Stagger
```typescript
// Staggered animation for lists
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
};
```

---

## Loading States

### Skeleton Loading
```css
/* Animated skeleton shimmer */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-100) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**Skeleton Patterns:**
```
Patient List Skeleton:
┌────────────────────────────────────┐
│ ┌──┐ ████████████████             │
│ │  │ ████████                     │
│ └──┘ ██████                       │
├────────────────────────────────────┤
│ ┌──┐ ████████████████             │
│ │  │ ████████                     │
│ └──┘ ██████                       │
└────────────────────────────────────┘

Form Skeleton:
┌────────────────────────────────────┐
│ ██████████                         │
│ ┌──────────────────────────────┐   │
│ │                              │   │
│ └──────────────────────────────┘   │
│                                    │
│ ██████████                         │
│ ┌──────────────────────────────┐   │
│ │                              │   │
│ └──────────────────────────────┘   │
└────────────────────────────────────┘
```

### Spinner
```css
/* Primary spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--gray-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-lg {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Progress Bar
```css
/* Progress bar for uploads */
.progress-container {
  width: 100%;
  height: 4px;
  background-color: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: var(--primary-500);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* Indeterminate progress */
.progress-indeterminate {
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--primary-500) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: progress-slide 1.5s ease-in-out infinite;
}

@keyframes progress-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

---

## Micro-interactions

### Button Press
```css
/* Button press effect */
.btn:active {
  transform: scale(0.98);
  transition: transform 100ms ease-out;
}
```

### Card Hover
```css
/* Card hover effect */
.card-interactive {
  transition: all 150ms ease-out;
}

.card-interactive:hover {
  transform: scale(1.02);
  box-shadow: var(--shadow-md);
}
```

### Focus Ring
```css
/* Focus ring for accessibility */
.focusable:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px var(--primary-500);
  transition: box-shadow 150ms ease;
}
```

### Form Validation Feedback
```css
/* Error shake animation */
.input-error {
  animation: shake 300ms ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* Success checkmark */
.input-valid::after {
  content: '✓';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--success);
  font-size: 14px;
  animation: pop-in 200ms ease-out;
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.5);
  }
  100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}
```

### AI Field Update
```css
/* AI field highlight when auto-filled */
.ai-field-update {
  animation: ai-flash 500ms ease-out;
}

@keyframes ai-flash {
  0% {
    background-color: rgba(139, 92, 246, 0.3);
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 transparent;
  }
}

/* Persistent AI indicator */
.ai-field-indicator {
  border-left: 3px solid var(--ai-suggested);
  padding-left: var(--space-3);
  transition: border-color 200ms ease;
}

.ai-field-indicator.confirmed {
  border-left-color: var(--ai-confirmed);
}
```

---

## Recording Animation

### Record Button States
```css
/* Record button - idle */
.record-button {
  background-color: var(--error);
  transition: all 150ms ease;
}

/* Record button - hover */
.record-button:hover {
  background-color: #dc2626;
  transform: scale(1.05);
}

/* Record button - recording */
.record-button.recording {
  animation: pulse-record 1s ease-in-out infinite;
}

@keyframes pulse-record {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }
}
```

### Recording Indicator
```css
/* Recording dot indicator */
.recording-dot {
  width: 8px;
  height: 8px;
  background-color: var(--error);
  border-radius: 50%;
  animation: blink-dot 1s ease-in-out infinite;
}

@keyframes blink-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

### Audio Waveform
```css
/* Audio waveform visualization */
.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 32px;
}

.waveform-bar {
  width: 4px;
  min-height: 4px;
  background-color: var(--primary-500);
  border-radius: 2px;
  animation: wave 500ms ease-in-out infinite;
}

.waveform-bar:nth-child(1) { animation-delay: 0ms; }
.waveform-bar:nth-child(2) { animation-delay: 100ms; }
.waveform-bar:nth-child(3) { animation-delay: 200ms; }
.waveform-bar:nth-child(4) { animation-delay: 300ms; }
.waveform-bar:nth-child(5) { animation-delay: 400ms; }

@keyframes wave {
  0%, 100% { height: 8px; }
  50% { height: 24px; }
}
```

---

## Real-time Transcription

### New Text Appearance
```typescript
// Transcription text animation
const transcriptionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};
```

```css
/* New transcription text */
.transcription-new {
  animation: fade-in-text 200ms ease-out;
}

@keyframes fade-in-text {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

/* Blinking cursor at end */
.transcription-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: var(--primary-500);
  margin-left: 2px;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Auto-scroll Behavior
```typescript
// Auto-scroll to bottom on new content
const transcriptionRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (transcriptionRef.current && isRecording) {
    transcriptionRef.current.scrollTo({
      top: transcriptionRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }
}, [transcription, isRecording]);
```

---

## Modal Animations

### Modal Enter/Exit
```typescript
// Modal animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};
```

---

## Dropdown Animations

### Dropdown Menu
```typescript
// Dropdown animation
const dropdownVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -5
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    transition: { duration: 0.1, ease: 'easeIn' }
  }
};
```

---

## Sidebar Animations

### Sidebar Collapse
```css
/* Sidebar transition */
.sidebar {
  width: 256px;
  transition: width 200ms ease-out;
}

.sidebar.collapsed {
  width: 64px;
}

/* Hide text when collapsed */
.sidebar.collapsed .nav-link-text {
  opacity: 0;
  width: 0;
  transition: opacity 100ms ease, width 100ms ease;
}

/* Tooltip on collapsed state */
.sidebar.collapsed .nav-link:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 100%;
  margin-left: 8px;
  padding: 4px 8px;
  background-color: var(--gray-900);
  color: white;
  font-size: var(--text-xs);
  border-radius: var(--radius-md);
  white-space: nowrap;
  animation: fade-in 150ms ease-out;
}
```

### Mobile Drawer
```typescript
// Mobile drawer animation
const drawerVariants = {
  hidden: { x: '-100%' },
  visible: {
    x: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: {
    x: '-100%',
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};
```

---

## Toast Animations

### Toast Enter/Exit
```typescript
// Toast animation
const toastVariants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.9
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};
```

---

## Tooltip Animations

### Tooltip Fade
```css
/* Tooltip animation */
.tooltip {
  animation: tooltip-fade-in 150ms ease-out;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## State Transitions

### Status Badge Change
```css
/* Animate status badge color change */
.status-badge {
  transition: background-color 200ms ease, color 200ms ease;
}
```

### Toggle Switch
```css
/* Toggle switch animation */
.toggle-thumb {
  transition: transform 150ms ease-out;
}

.toggle-thumb.checked {
  transform: translateX(20px);
}

.toggle-track {
  transition: background-color 150ms ease;
}
```

### Accordion
```typescript
// Accordion animation
const accordionVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeInOut' }
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeInOut' }
  }
};
```

---

## Performance Guidelines

### Animation Best Practices

1. **Use transform and opacity** - These properties can be GPU-accelerated
2. **Avoid layout thrashing** - Don't animate width, height, top, left
3. **Use will-change sparingly** - Only on elements that actually animate
4. **Respect reduced motion** - Honor user preferences

### Reduced Motion Support
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
```

### Animation Timing Reference

| Animation | Duration | Easing |
|-----------|----------|--------|
| Micro-interaction | 100ms | ease-out |
| Button hover | 150ms | ease-out |
| Card hover | 150ms | ease-out |
| Modal open | 200ms | ease-out |
| Modal close | 150ms | ease-in |
| Page transition | 200ms | ease-out |
| Toast enter | spring | damping: 20 |
| Skeleton shimmer | 1500ms | ease-in-out |
| Recording pulse | 1000ms | ease-in-out |
