# User Story US-010: User Authentication

## Story Card

**As a** doctor
**I want to** log in to the system securely
**So that** my patient data is protected and only I can access my records

---

## Description

The system requires basic authentication to protect sensitive medical data. For the MVP, this is simplified to a single-user login mechanism. The doctor enters credentials, the system validates them, and creates a session that persists until logout or timeout. Authentication gates access to all application features.

This is a foundational technical story that enables secure access to all other features.

---

## Acceptance Criteria

- [ ] Given I am not logged in, when I access any protected page, then I am redirected to the login page
- [ ] Given I am on the login page, when I view the form, then I see email and password fields
- [ ] Given I enter valid credentials, when I submit the form, then I am logged in and redirected to the dashboard
- [ ] Given I enter invalid credentials, when I submit the form, then I see an error message "Invalid email or password"
- [ ] Given I am logged in, when my session is active, then I can access all application features
- [ ] Given I am logged in, when I click "Logout", then my session ends and I am redirected to the login page
- [ ] Given I am logged in, when I close the browser and return, then I remain logged in (session persistence)
- [ ] Given my session has been inactive for 24 hours, when I try to access the app, then I must log in again
- [ ] Given I am logged in, when I view the header, then I see my name/email and a logout option

---

## Priority

**Must-Have (P0)** - Infrastructure

---

## Story Points

**5 points**

Rationale: Standard authentication implementation with session management.

---

## Dependencies

| Dependency | Type | Story |
|------------|------|-------|
| Data Persistence | Required | US-011 |

---

## Technical Notes

### Data Model

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;      // bcrypt hashed
  name: string;
  role: 'doctor' | 'admin';  // For future expansion
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
```

### Implementation Approach

**Recommended: NextAuth.js**

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (user && await bcrypt.compare(credentials.password, user.passwordHash)) {
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
  }
});
```

### Security Considerations

- Passwords must be hashed with bcrypt (cost factor 12)
- Use HTTPS in production
- Session tokens should be HTTP-only cookies
- Implement CSRF protection on forms
- Don't reveal if email exists in error messages
- Rate limiting on login attempts (optional for MVP)
- Secure session token generation

### API Endpoints

```
POST /api/auth/login          - Authenticate user
POST /api/auth/logout         - End session
GET  /api/auth/session        - Get current session
GET  /api/auth/me             - Get current user
```

### MVP Seed User

```typescript
// prisma/seed.ts
const hashedPassword = await bcrypt.hash('demo123', 12);

await prisma.user.create({
  data: {
    email: 'doctor@medrecord.ai',
    passwordHash: hashedPassword,
    name: 'Dr. Demo User',
    role: 'doctor'
  }
});
```

---

## UI/UX Notes

### Login Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                    ┌─────────────────────┐                      │
│                    │   MEDRECORD AI      │                      │
│                    │   🏥                │                      │
│                    └─────────────────────┘                      │
│                                                                  │
│                    ┌─────────────────────────────────────┐      │
│                    │                                     │      │
│                    │  Email                              │      │
│                    │  [doctor@medrecord.ai          ]    │      │
│                    │                                     │      │
│                    │  Password                           │      │
│                    │  [••••••••                     ]    │      │
│                    │                                     │      │
│                    │  [ ] Remember me                    │      │
│                    │                                     │      │
│                    │  [        Sign In              ]    │      │
│                    │                                     │      │
│                    └─────────────────────────────────────┘      │
│                                                                  │
│                    Forgot password?                              │
│                                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Login Error State

```
┌─────────────────────────────────────────────────────────────────┐
│                    │                                     │      │
│                    │  ⚠️ Invalid email or password      │      │
│                    │                                     │      │
│                    │  Email                              │      │
│                    │  [doctor@medrecord.ai          ]    │      │
│                    │                                     │      │
└─────────────────────────────────────────────────────────────────┘
```

### Header with User Info

```
┌─────────────────────────────────────────────────────────────────┐
│  MEDRECORD AI              Dr. Demo User ▼                      │
│                            ┌────────────────┐                   │
│                            │ 👤 Profile     │                   │
│                            │ ⚙️ Settings    │                   │
│                            │ ─────────────  │                   │
│                            │ 🚪 Logout      │                   │
│                            └────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Loading State

```
┌─────────────────────────────────────────────────────────────────┐
│                    │                                     │      │
│                    │  [   ⏳ Signing in...          ]    │      │
│                    │                                     │      │
└─────────────────────────────────────────────────────────────────┘
```

### Design Guidelines

- Login page should be simple and clean
- "Remember me" checkbox (optional for MVP)
- Error messages should not reveal if email exists
- Loading state during authentication
- Automatic redirect to intended page after login
- User name and logout option visible in header
- Dropdown menu for user options

---

## Testing Scenarios

| Scenario | Input | Expected Result |
|----------|-------|-----------------|
| Valid login | Correct credentials | Logged in, redirect to dashboard |
| Invalid password | Wrong password | "Invalid email or password" |
| Invalid email | Non-existent email | "Invalid email or password" |
| Empty fields | No input | Validation error |
| Access protected | Not logged in | Redirect to login |
| Session persistence | Close and reopen browser | Still logged in |
| Logout | Click logout | Session ended, redirect to login |
| Session timeout | Wait 24+ hours | Must log in again |
| View user info | Logged in | Name displayed in header |

---

## Definition of Done

- [ ] Login page renders correctly
- [ ] Email and password fields work
- [ ] Valid credentials log user in
- [ ] Invalid credentials show error
- [ ] Protected routes redirect to login
- [ ] Session persists across page refreshes
- [ ] Logout ends session
- [ ] Session times out after 24 hours
- [ ] User info displayed in header
- [ ] Password stored hashed
- [ ] CSRF protection enabled
- [ ] Unit tests pass
- [ ] Manual QA verified
