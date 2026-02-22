# Package Dependencies: MedRecord AI

This document lists all package dependencies for the Medical Record System MVP.

---

## Frontend Dependencies

### package.json

```json
{
  "name": "medrecord-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.20.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "zod": "^3.22.4",
    "axios": "^1.6.7",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.330.0",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "date-fns": "^3.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@typescript-eslint/eslint-plugin": "^7.0.1",
    "@typescript-eslint/parser": "^7.0.1",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.35",
    "prettier": "^3.2.5",
    "prettier-plugin-tailwindcss": "^0.5.11",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.3.3",
    "vite": "^5.1.0",
    "@testing-library/react": "^14.2.1",
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/user-event": "^14.5.2",
    "vitest": "^1.2.2",
    "@vitest/coverage-v8": "^1.2.2",
    "@vitest/ui": "^1.2.2",
    "jsdom": "^24.0.0"
  }
}
```

### Dependency Breakdown

#### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.2.0 | UI library |
| react-dom | ^18.2.0 | React DOM renderer |
| react-router-dom | ^6.22.0 | Client-side routing |

#### State Management & Data Fetching

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.20.0 | Server state management |
| axios | ^1.6.7 | HTTP client |

#### Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.50.0 | Form state management |
| @hookform/resolvers | ^3.3.4 | Validation resolvers |
| zod | ^3.22.4 | Schema validation |

#### UI Components (shadcn/ui dependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-avatar | ^1.0.4 | Avatar component |
| @radix-ui/react-dialog | ^1.0.5 | Modal dialogs |
| @radix-ui/react-dropdown-menu | ^2.0.6 | Dropdown menus |
| @radix-ui/react-label | ^2.0.2 | Form labels |
| @radix-ui/react-select | ^2.0.0 | Select dropdowns |
| @radix-ui/react-separator | ^1.0.3 | Visual separators |
| @radix-ui/react-slot | ^1.0.2 | Component composition |
| @radix-ui/react-tabs | ^1.0.4 | Tab navigation |
| @radix-ui/react-toast | ^1.1.5 | Toast notifications |
| @radix-ui/react-tooltip | ^1.0.7 | Tooltips |

#### Styling Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| clsx | ^2.1.0 | Conditional classes |
| tailwind-merge | ^2.2.1 | Merge Tailwind classes |
| class-variance-authority | ^0.7.0 | Component variants |
| lucide-react | ^0.330.0 | Icon library |

#### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | ^3.3.1 | Date formatting |

---

## Backend Dependencies

### package.json

```json
{
  "name": "medrecord-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "^5.10.0",
    "openai": "^4.28.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "zod": "^3.22.4",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "pino": "^8.19.0",
    "pino-http": "^9.0.0",
    "dotenv": "^16.4.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.8",
    "@types/node": "^20.11.16",
    "@typescript-eslint/eslint-plugin": "^7.0.1",
    "@typescript-eslint/parser": "^7.0.1",
    "eslint": "^8.56.0",
    "prettier": "^3.2.5",
    "typescript": "^5.3.3",
    "tsx": "^4.7.1",
    "prisma": "^5.10.0",
    "vitest": "^1.2.2",
    "@vitest/coverage-v8": "^1.2.2",
    "supertest": "^6.3.4",
    "@types/supertest": "^6.0.2",
    "pino-pretty": "^10.3.1"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Dependency Breakdown

#### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | Web framework |
| @prisma/client | ^5.10.0 | Database ORM client |
| dotenv | ^16.4.1 | Environment variables |

#### Authentication

| Package | Version | Purpose |
|---------|---------|---------|
| jsonwebtoken | ^9.0.2 | JWT generation/verification |
| bcrypt | ^5.1.1 | Password hashing |

#### Validation & Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^3.22.4 | Schema validation |
| multer | ^1.4.5-lts.1 | File upload handling |
| uuid | ^9.0.1 | UUID generation |

#### Security

| Package | Version | Purpose |
|---------|---------|---------|
| cors | ^2.8.5 | CORS middleware |
| helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | Rate limiting |

#### AI Integration

| Package | Version | Purpose |
|---------|---------|---------|
| openai | ^4.28.0 | OpenAI API client |

#### Logging

| Package | Version | Purpose |
|---------|---------|---------|
| pino | ^8.19.0 | JSON logger |
| pino-http | ^9.0.0 | HTTP request logging |
| pino-pretty | ^10.3.1 | Pretty log output (dev) |

---

## Shared Dependencies

### Same Version Across Projects

| Package | Version | Projects |
|---------|---------|----------|
| zod | ^3.22.4 | Frontend, Backend |
| typescript | ^5.3.3 | Frontend, Backend |
| eslint | ^8.56.0 | Frontend, Backend |
| prettier | ^3.2.5 | Frontend, Backend |
| vitest | ^1.2.2 | Frontend, Backend |

---

## Version Policy

### Semantic Versioning

- Use caret (`^`) for minor version flexibility
- Lock major versions to avoid breaking changes
- Update dependencies monthly for security patches

### Critical Dependencies

These should be updated carefully with testing:

| Package | Reason |
|---------|--------|
| @prisma/client | Database migrations |
| openai | API compatibility |
| react | Core framework |
| express | Core framework |

### Security Updates

Run regularly:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Update all dependencies
npm update
```

---

## Installation

### Fresh Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
npx prisma generate
```

### Clean Install (Reset node_modules)

```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

---

## Peer Dependencies

### Frontend Peer Dependencies

These are typically handled automatically by npm 7+:

| Package | Required By |
|---------|-------------|
| react | All React libraries |
| react-dom | @radix-ui/* |

### Backend Peer Dependencies

| Package | Required By |
|---------|-------------|
| @prisma/client | prisma |

---

## Optional Dependencies

### If Using pnpm

Add to `pnpm-workspace.yaml`:

```yaml
packages:
  - 'frontend'
  - 'backend'
```

### Additional Development Tools

```json
{
  "devDependencies": {
    "husky": "^9.0.10",
    "lint-staged": "^15.2.2",
    "@playwright/test": "^1.41.2"
  }
}
```

---

## Bundle Size Considerations

### Frontend (Estimated)

| Category | Size (gzipped) |
|----------|----------------|
| React + React DOM | ~45 KB |
| React Router | ~10 KB |
| React Query | ~13 KB |
| Radix UI Components | ~30 KB |
| Lucide Icons (tree-shaken) | ~5 KB |
| Axios | ~5 KB |
| Other utilities | ~10 KB |
| **Total (estimated)** | **~120 KB** |

### Optimization Tips

1. **Tree shaking**: Import only used icons from lucide-react
2. **Code splitting**: Use React.lazy for route-based splitting
3. **Production build**: Vite handles minification automatically

---

## License Compliance

### License Summary

| License | Packages |
|---------|----------|
| MIT | Most packages |
| Apache-2.0 | Some packages |
| ISC | Some packages |

All dependencies use permissive licenses compatible with commercial use.

### Check Licenses

```bash
# Install license checker
npm install -g license-checker

# Run in project directory
license-checker --summary
```

---

## Dependency Updates

### Check for Updates

```bash
# Check outdated packages
npm outdated

# Interactive update
npx npm-check-updates -i
```

### Update All Dependencies

```bash
# Update package.json
npx npm-check-updates -u

# Install updates
npm install

# Test thoroughly after updates!
npm test
```

---

## References

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI Node.js SDK](https://github.com/openai/openai-node)
