# Skill: Compatibility Guardian (Safeguard)

## Description

Advanced protocol to identify and alert about potential breaking changes or incompatibilities during updates to the INsitu AI codebase.

## Capabilities

- **Build-Check Verification**: Automatic verification that the project compiles correctly after any modification.
- **Dependency Audit**: Identification of conflicting peer dependencies or breaking version bumps.
- **Component Regression Awareness**: Check if UI changes affect existing critical modules (SearchInterface, VideoAudit).
- **Function Signature Validation**: Ensures changes in Netlify functions match the frontend's expectations.
- **Proactive UI/UX Audit**: Identifying bottlenecks, visual friction, or accessibility gaps and suggesting improvements BEFORE the user asks.

## Procedures

1. **Mandatory Build**: Always run `npm run build` or `bash scripts/check_compatibility.sh` before finalizing any PR or major update.
2. **Environment Sync**: If you add a new environment variable, ensure it's documented in `.env.example` and the agent's context.
3. **UI Verification**: After CSS/Tailwind changes, verify that common components (buttons, cards) still render correctly.
4. **Proactive Optimization**: Analyze the modified component for:
   - **Performance**: Excessive re-renders or heavy DOM operations.
   - **Clarity & Flow**: Coherent visual hierarchy and logical information architecture.
   - **Mobile First**: Ensuring responsiveness isn't just "there" but "optimal" (accessible touch targets, correct font sizing).

## Session Lessons (Mar 2026)

- **Admin Access Persistence**: NEVER remove email-based fallback logic for `isAdmin` in `App.tsx` and `Header.tsx`. This ensures that even if roles in DB fail, the developers (`sanchezfj@me.com`, `admin@insitu.ai`, etc.) maintain access.
- **Navigation ID Consistency**: Ensure that `id` values in `Header.tsx` EXACTLY match the expected `initialLab` state in `CreativeLabView.tsx`. Case-sensitivity or typos break the routing.
- **Netlify Function Stability**: All Netlify functions MUST explicitly import types (`Handler`, `HandlerEvent`) from `@netlify/functions` to avoid TS compilation errors during `npm run build`.
- **Super Admin Restrictions**: New or beta features (Audio Lab, Retail Hub, etc.) must be gated behind an `isSuperAdmin` check that includes both the `superAdmin` role AND the designated fallback emails.

## Criteria-based Action Protocol

For every suggested change, the agent MUST provide a rationale:

- **TECHNICAL CRITERIA**: "Improved by 15% build time", "Avoids FCP (First Contentful Paint) issues".
- **MARKETING/UX CRITERIA**: "Increases retention by reducing cognitive load", "Aligns with Google Search Quality Raters Guidelines".
- **VISUAL CRITERIA**: "Consistent with INsitu AI glassmorphism tokens", "Improved color contrast for WCAG AA".

## Logic for Alerts

If `npm run build` fails, the agent MUST NOT process the update and should instead:

1. Analyze the error log.
2. Identify the breaking change.
3. Fix the error or alert the user about the incompatibility if it's a structural design flaw.
