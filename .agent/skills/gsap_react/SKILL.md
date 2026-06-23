---
name: gsap-react
description: Official GSAP skill for React — useGSAP hook, refs, gsap.context(), cleanup. Use when the user wants animation in React or Next.js.
license: MIT
---

# GSAP with React

## When to Use This Skill

Apply when writing or reviewing GSAP code in React: setting up animations, cleaning up on unmount, or avoiding context/SSR issues.

**Related skills:** For tweens use **gsap-core**; for scroll use **gsap-scrolltrigger**; for performance use **gsap-performance**.

## Installation

```bash
npm install gsap @gsap/react
```

## Prefer useGSAP() Hook

```javascript
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const containerRef = useRef(null);

useGSAP(() => {
  gsap.to(".box", { x: 100 });
  gsap.from(".item", { opacity: 0, stagger: 0.1 });
}, { scope: containerRef });
```

- ✅ Pass a **scope** (ref or element) so selectors are scoped to that root
- ✅ Cleanup runs automatically on unmount
- ✅ Use **contextSafe** for event handler callbacks

## Dependency Array & revertOnUpdate

```javascript
useGSAP(() => {
  // gsap code here
}, {
  dependencies: [endX],
  scope: container,
  revertOnUpdate: true
});
```

## gsap.context() in useEffect (Fallback)

```javascript
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to(".box", { x: 100 });
  }, containerRef);
  return () => ctx.revert();
}, []);
```

- ✅ **Always** return cleanup that calls `ctx.revert()`

## Context-Safe Callbacks

```javascript
useGSAP((context, contextSafe) => {
  gsap.to(goodRef.current, { x: 100 }); // ✅ safe

  const onClickGood = contextSafe(() => {
    gsap.to(goodRef.current, { rotation: 180 });
  });
  goodRef.current.addEventListener('click', onClickGood);

  return () => {
    goodRef.current.removeEventListener('click', onClickGood);
  };
}, { scope: container });
```

## SSR (Next.js)

- Use **useGSAP** or **useEffect** so GSAP runs only on client
- Do not call `gsap.*` or `ScrollTrigger.*` during server render

## Best Practices

- ✅ Prefer `useGSAP()` over `useEffect()` for GSAP
- ✅ Use refs + scope for element targeting
- ✅ Run GSAP only on client side

## Do Not

- ❌ Target by selector without a scope
- ❌ Skip cleanup (always revert context)
- ❌ Run GSAP during SSR

### Learn More

https://gsap.com/resources/React
