# Creative Hub Unification & Super Admin Patterns

## Problem Statement

As the INsitu AI platform grows, we need to add specialized creative labs (Audio, Retail, Animation, etc.) without cluttering the main navigation. These labs often require strict access control during development.

## Architectural Pattern: Unified Creative Lab

Instead of separate routes for each lab, use a single `CreativeLabView.tsx` component that:

1. **Accepts an `initialLab` prop**: Allows internal state to sync with external navigation.
2. **Uses a Centralized `useEffect` for Redirects**:
   - If a user tries to access a restricted lab (e.g., `animate`, `audio`) and is NOT a `superAdmin`, redirect them to a default safe lab (e.g., `image`).
3. **Restores Admin Fallbacks**: Since role-based access from the database can fail or be accidentally wiped, always include hardcoded email fallbacks for the developers and owner.

### Code Pattern: The `isSuperAdmin` Check

```typescript
const isAdmin = user?.role === 'admin' || 
                user?.role === 'superAdmin' || 
                ['admin@insitu.ai', 'sanchezfj@me.com', 'sociopuerta@gmail.com'].includes(user?.email || '');

const isSuperAdmin = user?.role === 'superAdmin' || 
                     ['admin@insitu.ai', 'sanchezfj@me.com'].includes(user?.email || '');
```

## Navigation Consistency

The `id` in the `Header.tsx` dropdown MUST match the `initialLab` state exactly.

**Example Fix**:

- **Bad**: `id: "adSpy"` (Frontend expected "adspy")
- **Good**: `id: "adspy"`

## Netlify Function Compliance

1. **Explicit Imports**: Always import `Handler`, `HandlerEvent`, and `HandlerContext` from `@netlify/functions`.
2. **Vertex AI Auth**: Use `google-auth-library` to generate OAuth2 tokens for REST calls. Do NOT use API keys for Vertex AI services.
3. **MIME Type Handling**: Ensure `responseMimeType: "application/json"` is set for Gemini 2.0 Flash to ensure consistent parsing in serverless handlers.
