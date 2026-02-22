# Component Styles

Estilos detallados para todos los componentes de MedRecord AI, basados en shadcn/ui y Tailwind CSS.

---

## Buttons

### Primary Button
```css
/* Primary Button - Main actions */
.btn-primary {
  background-color: var(--primary-500);     /* #3b82f6 */
  color: white;
  padding: var(--space-2) var(--space-4);   /* 8px 16px */
  border-radius: var(--radius-md);          /* 6px */
  font-weight: var(--font-semibold);        /* 600 */
  font-size: var(--text-sm);                /* 14px */
  height: 40px;

  /* Transitions */
  transition: background-color 150ms ease-out, transform 100ms ease-out;
}

.btn-primary:hover {
  background-color: var(--primary-600);     /* #2563eb */
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:focus-visible {
  outline: none;
  ring: 2px solid var(--primary-500);
  ring-offset: 2px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

### Secondary Button
```css
/* Secondary Button - Alternative actions */
.btn-secondary {
  background-color: var(--gray-100);        /* #f3f4f6 */
  color: var(--gray-700);                   /* #374151 */
  border: 1px solid var(--gray-200);        /* #e5e7eb */
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  height: 40px;
}

.btn-secondary:hover {
  background-color: var(--gray-200);
}
```

### Danger Button
```css
/* Danger Button - Destructive actions */
.btn-danger {
  background-color: var(--error);           /* #ef4444 */
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  height: 40px;
}

.btn-danger:hover {
  background-color: #dc2626;                /* Darker red */
}
```

### Ghost Button
```css
/* Ghost Button - Subtle actions */
.btn-ghost {
  background-color: transparent;
  color: var(--gray-700);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  height: 40px;
}

.btn-ghost:hover {
  background-color: var(--gray-100);
}
```

### Outline Button
```css
/* Outline Button - Bordered style */
.btn-outline {
  background-color: transparent;
  color: var(--primary-500);
  border: 1px solid var(--primary-500);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  height: 40px;
}

.btn-outline:hover {
  background-color: var(--primary-50);
}
```

### Icon Button
```css
/* Icon Button - Square with icon */
.btn-icon {
  width: 40px;
  height: 40px;
  padding: var(--space-2);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sm {
  width: 32px;
  height: 32px;
}

.btn-icon-lg {
  width: 48px;
  height: 48px;
}
```

### Button Sizes

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| sm | 32px | 6px 12px | 13px |
| default | 40px | 8px 16px | 14px |
| lg | 48px | 10px 20px | 16px |

---

## Cards

### Standard Card
```css
/* Standard Card */
.card {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);          /* 8px */
  padding: var(--space-6);                  /* 24px */
  box-shadow: var(--shadow-sm);
}
```

### Interactive Card (Patient Cards)
```css
/* Interactive Card - Clickable with hover effects */
.card-interactive {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 150ms ease-out;
}

.card-interactive:hover {
  box-shadow: var(--shadow-md);
  transform: scale(1.02);
  border-color: var(--primary-200);
}

.card-interactive:focus-visible {
  outline: none;
  ring: 2px solid var(--primary-500);
  ring-offset: 2px;
}
```

### Elevated Card
```css
/* Elevated Card - More prominent */
.card-elevated {
  background-color: white;
  border: none;
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}
```

### Compact Card
```css
/* Compact Card - Less padding */
.card-compact {
  background-color: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}
```

---

## Forms

### Input Field
```css
/* Input Field */
.input {
  height: 40px;
  width: 100%;
  padding: var(--space-2) var(--space-3);   /* 8px 12px */
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);              /* 16px */
  color: var(--gray-900);
  background-color: white;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input::placeholder {
  color: var(--gray-400);
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input:disabled {
  background-color: var(--gray-50);
  color: var(--gray-500);
  cursor: not-allowed;
}
```

### Input with Error
```css
/* Input Error State */
.input-error {
  border-color: var(--error);
}

.input-error:focus {
  border-color: var(--error);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}
```

### Textarea
```css
/* Textarea */
.textarea {
  min-height: 100px;
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--gray-900);
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
```

### Label
```css
/* Label */
.label {
  display: block;
  font-size: var(--text-sm);                /* 14px */
  font-weight: var(--font-medium);          /* 500 */
  color: var(--gray-700);
  margin-bottom: var(--space-1);            /* 4px */
}

.label-required::after {
  content: ' *';
  color: var(--error);
}
```

### Error Message
```css
/* Error Message */
.error-message {
  font-size: var(--text-sm);
  color: var(--error);
  margin-top: var(--space-1);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}
```

### Form Group
```css
/* Form Group - Label + Input + Error */
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: var(--space-4);
}
```

### Select
```css
/* Select Dropdown */
.select {
  height: 40px;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  padding-right: var(--space-10);           /* Space for chevron */
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  color: var(--gray-900);
  background-color: white;
  appearance: none;
  background-image: url("chevron-down-icon");
  background-position: right 12px center;
  background-repeat: no-repeat;
  cursor: pointer;
}
```

### Checkbox
```css
/* Checkbox */
.checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  background-color: white;
  cursor: pointer;
}

.checkbox:checked {
  background-color: var(--primary-500);
  border-color: var(--primary-500);
}

.checkbox:focus-visible {
  outline: none;
  ring: 2px solid var(--primary-500);
  ring-offset: 2px;
}
```

---

## AI Indicators

### AI Badge
```css
/* AI Suggestion Badge */
.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  background-color: rgba(139, 92, 246, 0.1);
  color: var(--ai-suggested);               /* #8b5cf6 */
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);                /* 12px */
  font-weight: var(--font-medium);
}

.ai-badge-icon {
  width: 12px;
  height: 12px;
}
```

### AI Processing Badge
```css
/* AI Processing Badge - Animated */
.ai-badge-processing {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--ai-processing);              /* #f59e0b */
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  animation: pulse 2s ease-in-out infinite;
}
```

### AI Confirmed Badge
```css
/* AI Confirmed Badge */
.ai-badge-confirmed {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--ai-confirmed);               /* #10b981 */
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}
```

### AI Field Highlight
```css
/* AI Field Highlight - When field is auto-filled */
.ai-field-highlight {
  position: relative;
  animation: ai-highlight 500ms ease-out;
}

.ai-field-highlight::after {
  content: '';
  position: absolute;
  top: -2px;
  right: -2px;
  bottom: -2px;
  left: -2px;
  border: 2px solid var(--ai-suggested);
  border-radius: var(--radius-md);
  pointer-events: none;
  opacity: 0;
  animation: fade-border 500ms ease-out;
}

@keyframes ai-highlight {
  0% { background-color: rgba(139, 92, 246, 0.2); }
  100% { background-color: transparent; }
}
```

---

## Status Badges

### Appointment Status Badge
```css
/* Base Status Badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  text-transform: capitalize;
}

/* Status Variants */
.status-scheduled {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--status-scheduled);
}

.status-checked-in {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--status-checked-in);
}

.status-in-progress {
  background-color: rgba(139, 92, 246, 0.1);
  color: var(--status-in-progress);
}

.status-completed {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--status-completed);
}

.status-cancelled {
  background-color: rgba(107, 114, 128, 0.1);
  color: var(--status-cancelled);
}

.status-no-show {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--status-no-show);
}
```

### Appointment Type Badge
```css
/* Appointment Type Badge */
.type-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 10px;
  background-color: var(--gray-100);
  color: var(--gray-700);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}
```

---

## Navigation

### Sidebar
```css
/* Sidebar Container */
.sidebar {
  width: 256px;
  height: 100vh;
  background-color: white;
  border-right: 1px solid var(--gray-200);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: var(--z-30);
}

.sidebar-collapsed {
  width: 64px;
}
```

### Nav Link
```css
/* Navigation Link */
.nav-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--gray-600);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: all 150ms ease;
}

.nav-link:hover {
  background-color: var(--gray-100);
  color: var(--gray-900);
}

.nav-link-active {
  background-color: var(--primary-50);
  color: var(--primary-600);
}

.nav-link-active:hover {
  background-color: var(--primary-100);
}
```

### Header
```css
/* Header */
.header {
  height: 64px;
  background-color: white;
  border-bottom: 1px solid var(--gray-200);
  padding: 0 var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: var(--z-20);
}
```

### Breadcrumb
```css
/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.breadcrumb-item {
  color: var(--gray-500);
}

.breadcrumb-item:hover {
  color: var(--gray-700);
}

.breadcrumb-current {
  color: var(--gray-900);
  font-weight: var(--font-medium);
}

.breadcrumb-separator {
  color: var(--gray-400);
}
```

---

## Modals & Dialogs

### Modal Overlay
```css
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-50);
  animation: fade-in 200ms ease-out;
}
```

### Modal Content
```css
/* Modal Content */
.modal-content {
  background-color: white;
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slide-up 200ms ease-out;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  color: var(--gray-500);
}

.modal-close:hover {
  background-color: var(--gray-100);
}

.modal-body {
  margin-bottom: var(--space-6);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

---

## Transcription Panel

### Panel Container
```css
/* Transcription Panel */
.transcription-panel {
  width: 40%;
  min-width: 400px;
  height: 100%;
  background-color: var(--gray-50);
  border-left: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
}

.transcription-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--gray-200);
  background-color: white;
}

.transcription-content {
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
}
```

### Recording Controls
```css
/* Record Button - Idle */
.record-button {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background-color: var(--error);           /* Red */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 150ms ease;
}

.record-button:hover {
  background-color: #dc2626;
  transform: scale(1.05);
}

/* Record Button - Recording */
.record-button-recording {
  animation: pulse-recording 1s ease-in-out infinite;
}

@keyframes pulse-recording {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### Transcription Display
```css
/* Transcription Text */
.transcription-text {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--gray-700);
  white-space: pre-wrap;
}

.transcription-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: var(--primary-500);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

### Waveform Visualizer
```css
/* Audio Waveform */
.waveform {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 32px;
}

.waveform-bar {
  width: 4px;
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

## Tables

### Data Table
```css
/* Table Container */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  background-color: var(--gray-50);
  color: var(--gray-500);
  font-weight: var(--font-medium);
  border-bottom: 1px solid var(--gray-200);
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--gray-100);
  color: var(--gray-700);
}

.table tr:hover td {
  background-color: var(--gray-50);
}
```

---

## Avatars

### User Avatar
```css
/* Avatar */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--primary-100);
  color: var(--primary-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.avatar-sm {
  width: 32px;
  height: 32px;
  font-size: var(--text-xs);
}

.avatar-lg {
  width: 56px;
  height: 56px;
  font-size: var(--text-lg);
}
```

---

## Tooltips

### Tooltip
```css
/* Tooltip */
.tooltip {
  padding: var(--space-2) var(--space-3);
  background-color: var(--gray-900);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  box-shadow: var(--shadow-md);
  z-index: var(--z-40);
  max-width: 200px;
}
```

---

## Skeleton Loading

### Skeleton Base
```css
/* Skeleton */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-100) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-text {
  height: 16px;
  width: 100%;
}

.skeleton-circle {
  border-radius: var(--radius-full);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```
