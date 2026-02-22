# Layout Components Specification

## Overview

This document specifies the layout components that structure the application's pages. These components handle the overall page structure, navigation, and consistent UI patterns.

## Component Hierarchy

```
App
├── PublicLayout (login, 404)
│   └── children
└── MainLayout (authenticated pages)
    ├── Sidebar
    ├── Header
    └── Main Content
        └── children
```

## PublicLayout

Simple centered layout for unauthenticated pages.

```typescript
// src/components/layout/PublicLayout.tsx

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      {children}
    </div>
  </div>
);
```

### Visual Structure

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                                                                  │
│                    ┌────────────────────┐                        │
│                    │                    │                        │
│                    │   [Page Content]   │                        │
│                    │                    │                        │
│                    └────────────────────┘                        │
│                                                                  │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Background: secondary-50 (light gray)
Content: Centered, max-width 400px
```

## MainLayout

Primary layout for authenticated pages with sidebar navigation.

```typescript
// src/components/layout/MainLayout.tsx

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={isMobile ? true : sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
      />

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
          isMobile && 'ml-0'
        )}
      >
        <Header
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          showMenuButton={isMobile}
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
```

### Visual Structure

```
┌────────┬───────────────────────────────────────────────────────────┐
│        │ Header                                      [User Menu ▼] │
│ Side   ├───────────────────────────────────────────────────────────┤
│ bar    │                                                           │
│        │                                                           │
│ ┌────┐ │                                                           │
│ │ 🏠 │ │                     Main Content                          │
│ │Dash│ │                                                           │
│ └────┘ │                                                           │
│        │                                                           │
│ ┌────┐ │                                                           │
│ │ 👥 │ │                                                           │
│ │Pcts│ │                                                           │
│ └────┘ │                                                           │
│        │                                                           │
│        │                                                           │
│ ┌────┐ │                                                           │
│ │ ⚙️ │ │                                                           │
│ │Set │ │                                                           │
│ └────┘ │                                                           │
└────────┴───────────────────────────────────────────────────────────┘

Sidebar: 256px expanded, 64px collapsed
Header: 64px height
Main: Remaining space with padding
```

## Sidebar

Navigation sidebar with collapsible functionality.

```typescript
// src/components/layout/Sidebar.tsx

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Pacientes', icon: Users },
];

const bottomNavItems: NavItem[] = [
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  isMobile,
}) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 h-full bg-white border-r border-secondary-200',
        'flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        isMobile && collapsed && '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-secondary-200">
        {collapsed ? (
          <Logo size="sm" />
        ) : (
          <Logo size="md" showText />
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            collapsed={collapsed}
            icon={item.icon}
            label={item.label}
            active={location.pathname.startsWith(item.path)}
          />
        ))}
      </nav>

      {/* Bottom navigation */}
      <nav className="p-2 border-t border-secondary-200 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            collapsed={collapsed}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.path}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      {!isMobile && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-white border border-secondary-200 rounded-full p-1 shadow-sm hover:bg-secondary-50"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </aside>
  );
};
```

### NavLink Component

```typescript
// src/components/layout/NavLink.tsx

interface NavLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  active: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon: Icon,
  label,
  collapsed,
  active,
}) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
      'hover:bg-secondary-100',
      active && 'bg-primary-50 text-primary-700 hover:bg-primary-100',
      !active && 'text-secondary-700'
    )}
  >
    <Icon size={20} className={active ? 'text-primary-600' : ''} />
    {!collapsed && <span className="font-medium">{label}</span>}
  </Link>
);
```

### Sidebar States

**Expanded (Desktop)**
```
┌────────────────────┐
│ [Logo] MedRecord   │
├────────────────────┤
│                    │
│ 🏠 Dashboard       │
│                    │
│ 👥 Pacientes    ● │
│                    │
│                    │
│                    │
├────────────────────┤
│ ⚙️ Configuración   │
└────────────────────┘
     [◀]
```

**Collapsed (Desktop)**
```
┌────┐
│[L] │
├────┤
│    │
│ 🏠 │
│    │
│ 👥 │
│ ● │
│    │
├────┤
│ ⚙️ │
└────┘
  [▶]
```

**Mobile (Hidden/Drawer)**
```
Hamburger menu in header
Sidebar slides in from left
Overlay dims background
```

## Header

Page header with title, breadcrumbs, and actions.

```typescript
// src/components/layout/Header.tsx

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  showMenuButton = false,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-secondary-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-secondary-100"
          >
            <Menu size={20} />
          </button>
        )}
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-4">
        <UserMenu user={user} onLogout={logout} />
      </div>
    </header>
  );
};
```

### UserMenu Component

```typescript
// src/components/layout/UserMenu.tsx

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary-100">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden sm:block">{user.name}</span>
        <ChevronDown size={16} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem disabled>
        <User size={16} className="mr-2" />
        {user.email}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onLogout}>
        <LogOut size={16} className="mr-2" />
        Cerrar Sesión
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

## Breadcrumbs

Navigation breadcrumb trail.

```typescript
// src/components/layout/Breadcrumbs.tsx

interface Breadcrumb {
  path: string;
  label: string;
}

export const Breadcrumbs: React.FC = () => {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight size={14} className="text-secondary-400" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="text-secondary-900 font-medium">
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-secondary-500 hover:text-secondary-700"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
```

### Breadcrumb Examples

| Page | Breadcrumb |
|------|------------|
| Dashboard | Dashboard |
| Patients List | Dashboard > Pacientes |
| Patient Detail | Dashboard > Pacientes > María García |
| New Patient | Dashboard > Pacientes > Nuevo Paciente |
| New Appointment | Dashboard > Pacientes > María García > Nueva Cita |
| Appointment | Dashboard > Pacientes > María García > Consulta |

## PageHeader

Reusable page header with title and actions.

```typescript
// src/components/layout/PageHeader.tsx

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-secondary-900">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-secondary-500">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
```

### Usage Example

```tsx
<PageHeader
  title="Pacientes"
  subtitle="127 pacientes registrados"
  actions={
    <Button onClick={() => navigate('/patients/new')}>
      <Plus size={16} className="mr-2" />
      Nuevo Paciente
    </Button>
  }
/>
```

## Logo

Application logo component.

```typescript
// src/components/layout/Logo.tsx

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = false }) => {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('bg-primary-600 rounded-lg flex items-center justify-center', sizes[size])}>
        <Stethoscope className="text-white" size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
      </div>
      {showText && (
        <span className="font-bold text-lg text-secondary-900">
          MedRecord AI
        </span>
      )}
    </div>
  );
};
```

## ContentCard

Wrapper for page content sections.

```typescript
// src/components/layout/ContentCard.tsx

interface ContentCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className,
}) => (
  <Card className={cn('p-6', className)}>
    {(title || actions) && (
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
          )}
          {subtitle && (
            <p className="text-sm text-secondary-500">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </Card>
);
```

## Responsive Behavior

### Breakpoints

| Breakpoint | Sidebar | Header | Layout |
|------------|---------|--------|--------|
| Desktop (>1024px) | Expanded/Collapsible | Full | Side by side |
| Tablet (768-1024px) | Collapsed by default | Full | Side by side |
| Mobile (<768px) | Hidden (drawer) | With hamburger | Single column |

### Mobile Adaptations

- Sidebar becomes a slide-out drawer
- Header shows hamburger menu button
- Overlay dims background when sidebar open
- Touch-friendly tap targets (44px minimum)

## File Structure

```
src/components/layout/
├── PublicLayout.tsx
├── MainLayout.tsx
├── Sidebar.tsx
├── NavLink.tsx
├── Header.tsx
├── UserMenu.tsx
├── Breadcrumbs.tsx
├── PageHeader.tsx
├── ContentCard.tsx
├── Logo.tsx
└── index.ts
```
