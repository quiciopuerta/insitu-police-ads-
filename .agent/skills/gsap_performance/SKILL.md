---
name: gsap-performance
description: Official GSAP skill for animation performance — transforms, will-change, batching, quickTo, cleanup.
license: MIT
---

# GSAP Performance

## When to Use This Skill

Apply when optimizing GSAP animations for 60fps, reducing jank, or reviewing animation code for performance.

**Related skills:** For core API use **gsap-core**; for scroll use **gsap-scrolltrigger**.

## Core Principle

Animate only **transform** (`x`, `y`, `scaleX`, `scaleY`, `rotation`) and **opacity** — these stay on the compositor and avoid layout recalculation.

## Transform Aliases

Use GSAP's `x`, `y`, `scale`, `rotation` instead of `left`, `top`, `width`, `height`.

```javascript
// ✅ Good — compositor only
gsap.to(".box", { x: 100, opacity: 0.5 });

// ❌ Bad — triggers layout
gsap.to(".box", { left: 100, width: "50%" });
```

## will-change

Apply sparingly, only on elements being animated:

```css
.animating { will-change: transform; }
```

Remove after animation completes if the element won't animate again.

## Batch DOM Reads/Writes

Prevent layout thrashing:

```javascript
// ✅ Read all, then write all
const heights = elements.map(el => el.offsetHeight);
elements.forEach((el, i) => gsap.set(el, { y: heights[i] }));
```

## Stagger Over Individual Tweens

```javascript
// ✅ One tween with stagger
gsap.to(".item", { y: -20, stagger: 0.1 });

// ❌ Multiple individual tweens
items.forEach(item => gsap.to(item, { y: -20 }));
```

## gsap.quickTo() — Mouse Followers

Reuse a single tween for frequently updated properties:

```javascript
const xTo = gsap.quickTo(".cursor", "x", { duration: 0.3, ease: "power3" });
const yTo = gsap.quickTo(".cursor", "y", { duration: 0.3, ease: "power3" });

window.addEventListener("pointermove", (e) => {
  xTo(e.clientX);
  yTo(e.clientY);
});
```

## ScrollTrigger Performance

- Pin only necessary elements
- Debounce `ScrollTrigger.refresh()` — only call when layout genuinely changes
- Test scrub values on lower-end devices
- Kill off-screen animations

## Best Practices

- ✅ Animate transforms and opacity only
- ✅ Use `will-change` sparingly on active elements
- ✅ Batch DOM reads before writes
- ✅ Use stagger for groups
- ✅ Use `gsap.quickTo()` for frequent updates
- ✅ Clean up inactive animations

## Do Not

- ❌ Animate `width`, `height`, `top`, `left`, `margin`, `padding`
- ❌ Apply `will-change` to everything
- ❌ Create excessive simultaneous tweens
- ❌ Leave animations running when off-screen

### Learn More

https://gsap.com/docs/v3/
