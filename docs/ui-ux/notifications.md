# Notification System

Sistema de notificaciones para MedRecord AI, incluyendo toasts, alertas inline y feedback contextual.

---

## Toast Notifications

### Configuration

```typescript
// Toast configuration
const toastConfig = {
  position: 'top-right',
  duration: 5000,           // Auto-dismiss after 5 seconds
  dismissible: true,        // Show close button
  pauseOnHover: true,       // Pause timer on hover
  maxVisible: 3,            // Maximum toasts visible at once
};
```

### Position

```
┌─────────────────────────────────────────────────────────────────┐
│                                              ┌────────────────┐ │
│                                              │ Toast 1        │ │
│                                              └────────────────┘ │
│                                              ┌────────────────┐ │
│                                              │ Toast 2        │ │
│                                              └────────────────┘ │
│                                                                 │
│                          Page Content                           │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Position:** Top-right, offset from edges by 16px (space-4)

---

### Toast Types

#### Success Toast
```
┌────────────────────────────────────────────────────┐
│ ┃ ✓  Paciente guardado correctamente         ✕    │
│ ┃    Los datos han sido actualizados.             │
└────────────────────────────────────────────────────┘
     │
     └─ Green left border (--success)
```

**Styling:**
```css
.toast-success {
  background-color: white;
  border-left: 4px solid var(--success);
  box-shadow: var(--shadow-lg);
}

.toast-success-icon {
  color: var(--success);
  width: 20px;
  height: 20px;
}
```

---

#### Error Toast
```
┌────────────────────────────────────────────────────┐
│ ┃ ✕  Error al guardar                        ✕    │
│ ┃    No se pudo guardar la consulta.              │
│ ┃                                                 │
│ ┃    [Reintentar]                                 │
└────────────────────────────────────────────────────┘
     │
     └─ Red left border (--error)
```

**With Action Button:**
```css
.toast-error {
  background-color: white;
  border-left: 4px solid var(--error);
  box-shadow: var(--shadow-lg);
}

.toast-action {
  margin-top: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background-color: transparent;
  color: var(--error);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
}

.toast-action:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
```

---

#### Warning Toast
```
┌────────────────────────────────────────────────────┐
│ ┃ ⚠  Cambios sin guardar                    ✕    │
│ ┃    Tiene cambios pendientes que no se           │
│ ┃    han guardado.                                │
└────────────────────────────────────────────────────┘
     │
     └─ Yellow/Amber left border (--warning)
```

---

#### Info Toast
```
┌────────────────────────────────────────────────────┐
│ ┃ ℹ  Nueva versión disponible                ✕    │
│ ┃    Hay una actualización lista para             │
│ ┃    instalar.                                    │
│ ┃                                                 │
│ ┃    [Actualizar ahora]                           │
└────────────────────────────────────────────────────┘
     │
     └─ Blue left border (--info)
```

---

### Toast Component

```typescript
interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onDismiss: (id: string) => void;
}

const Toast = ({
  id,
  type,
  title,
  message,
  action,
  duration = 5000,
  onDismiss
}: ToastProps) => {
  const icons = {
    success: <Check className="w-5 h-5 text-success" />,
    error: <X className="w-5 h-5 text-error" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-info" />,
  };

  const borderColors = {
    success: 'border-l-success',
    error: 'border-l-error',
    warning: 'border-l-warning',
    info: 'border-l-info',
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`
        bg-white rounded-lg shadow-lg border-l-4 p-4 min-w-80 max-w-md
        ${borderColors[type]}
      `}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{title}</p>
          {message && (
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sm font-medium text-${type} hover:underline`}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar notificación"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
};
```

---

### Toast Container

```typescript
const ToastContainer = () => {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed top-4 right-4 z-60 flex flex-col gap-3"
      aria-live="polite"
      aria-label="Notificaciones"
    >
      <AnimatePresence mode="sync">
        {toasts.slice(0, 3).map(toast => (
          <Toast key={toast.id} {...toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};
```

---

### Toast Hook

```typescript
interface ToastData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

const useToast = () => {
  const [toasts, setToasts] = useState<(ToastData & { id: string })[]>([]);

  const toast = useCallback((data: ToastData) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { ...data, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    dismissAll,
    // Convenience methods
    success: (title: string, message?: string) =>
      toast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      toast({ type: 'error', title, message, duration: 0 }),
    warning: (title: string, message?: string) =>
      toast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      toast({ type: 'info', title, message }),
  };
};
```

---

### Common Toast Messages

| Action | Type | Title | Message |
|--------|------|-------|---------|
| Save success | success | "Guardado" | "Los cambios han sido guardados" |
| Patient created | success | "Paciente registrado" | "El paciente ha sido creado exitosamente" |
| Appointment created | success | "Cita creada" | "La cita ha sido programada" |
| Appointment completed | success | "Consulta completada" | "La consulta ha sido guardada" |
| Delete success | success | "Eliminado" | "El registro ha sido eliminado" |
| Login success | success | "Bienvenido" | "Ha iniciado sesión correctamente" |
| Save error | error | "Error al guardar" | "No se pudieron guardar los cambios" |
| Network error | error | "Error de conexión" | "No se pudo conectar al servidor" |
| Validation error | error | "Datos inválidos" | "Por favor, revise los campos marcados" |
| Session expired | warning | "Sesión expirada" | "Por favor, inicie sesión nuevamente" |
| Unsaved changes | warning | "Cambios sin guardar" | "Tiene cambios pendientes" |
| AI processing | info | "Procesando" | "Extrayendo información con IA..." |

---

## In-Context Notifications

### AI Field Updated

**Brief Tooltip:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Motivo de consulta:                                    [AI ✓]  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dolor de cabeza persistente                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                        ┌─────────────────────────┐              │
│                        │ ✓ Campo actualizado     │ ← Tooltip   │
│                        │   por IA                │              │
│                        └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
```css
.ai-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background-color: var(--ai-suggested);
  color: white;
  font-size: var(--text-xs);
  border-radius: var(--radius-md);
  white-space: nowrap;
  animation: tooltip-fade 2s ease-out forwards;
}

@keyframes tooltip-fade {
  0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
```

---

### Auto-Save Indicator

**Header Status:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Consulta médica                              ○ Guardando...    │
└─────────────────────────────────────────────────────────────────┘

After save (2 seconds):
┌─────────────────────────────────────────────────────────────────┐
│ Consulta médica                                  ✓ Guardado    │
└─────────────────────────────────────────────────────────────────┘

Then fades to:
┌─────────────────────────────────────────────────────────────────┐
│ Consulta médica                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Component:**
```typescript
const AutoSaveIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) => {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saving' && (
        <>
          <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Guardando...</span>
        </>
      )}
      {status === 'saved' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1 text-success"
        >
          <Check className="w-4 h-4" />
          <span>Guardado</span>
        </motion.div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1 text-error">
          <AlertCircle className="w-4 h-4" />
          <span>Error al guardar</span>
        </div>
      )}
    </div>
  );
};
```

---

### Recording Status

**Recording Notification:**
```
┌──────────────────────────────────────────────────┐
│  🔴 Grabando • 00:45                             │
└──────────────────────────────────────────────────┘
```

**Processing Notification:**
```
┌──────────────────────────────────────────────────┐
│  ○ Procesando audio...                           │
└──────────────────────────────────────────────────┘
```

---

## Inline Alerts

### Form Section Alert

**Warning Alert:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠ Alergias                                                     │
│                                                                 │
│ Este paciente tiene alergias registradas. Revise antes         │
│ de prescribir medicamentos.                                    │
│                                                                 │
│ • Penicilina (severa)                                          │
│ • Aspirina (moderada)                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
```css
.alert-warning {
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.alert-warning-icon {
  color: var(--warning);
}

.alert-warning-title {
  color: #92400e; /* Darker amber for text */
  font-weight: var(--font-semibold);
}

.alert-warning-text {
  color: #b45309;
}
```

---

### Info Banner

**Session Info:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ℹ Su sesión expirará en 5 minutos                    [Extender]│
└─────────────────────────────────────────────────────────────────┘
```

---

## Confirmation Dialogs

### Delete Confirmation

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   ⚠ ¿Eliminar paciente?                           │
│                                                    │
│   Esta acción eliminará permanentemente al         │
│   paciente "Juan Pérez" y todos sus registros.    │
│                                                    │
│   Esta acción no se puede deshacer.               │
│                                                    │
│                    [Cancelar]  [Eliminar]          │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Component:**
```typescript
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger'
}: ConfirmDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {variant === 'danger' && <AlertTriangle className="text-error" />}
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogDescription>{message}</DialogDescription>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

### Unsaved Changes Prompt

```
┌────────────────────────────────────────────────────┐
│                                                    │
│   ⚠ ¿Salir sin guardar?                           │
│                                                    │
│   Tiene cambios sin guardar que se perderán       │
│   si abandona esta página.                        │
│                                                    │
│      [Descartar cambios]  [Guardar y salir]       │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Progress Notifications

### Long Operation Progress

**AI Processing:**
```
┌────────────────────────────────────────────────────┐
│ ✨ Procesando con IA                               │
│                                                    │
│ Extrayendo información médica de la               │
│ transcripción...                                  │
│                                                    │
│ ████████████░░░░░░░░░ 60%                         │
│                                                    │
│ [Cancelar]                                         │
└────────────────────────────────────────────────────┘
```

---

## Notification Sounds (Optional)

For MVP, sounds are optional but can enhance UX:

| Event | Sound | Volume |
|-------|-------|--------|
| Recording started | Short beep | 30% |
| Recording stopped | Double beep | 30% |
| AI extraction complete | Soft chime | 20% |
| Error occurred | Low tone | 30% |

**Implementation Note:** Include user setting to enable/disable sounds.

---

## Notification Best Practices

### When to Use Each Type

| Scenario | Notification Type |
|----------|-------------------|
| Success feedback | Toast (auto-dismiss) |
| Error feedback | Toast (persistent) |
| Warnings | Toast or Inline alert |
| Status updates | Inline indicator |
| Destructive actions | Confirmation dialog |
| Field-level feedback | Tooltip or inline |

### Timing

- **Success toasts:** 3-5 seconds
- **Error toasts:** Persistent until dismissed
- **Warning toasts:** 5-7 seconds
- **AI tooltips:** 2 seconds
- **Auto-save indicators:** 2-3 seconds after action

### Stacking

- Maximum 3 toasts visible at once
- New toasts push old ones down
- Dismissed toasts animate out

### Accessibility

- All toasts have `role="alert"`
- Error toasts use `aria-live="assertive"`
- Success/info toasts use `aria-live="polite"`
- Close buttons have accessible labels
- Toast messages are concise and clear
