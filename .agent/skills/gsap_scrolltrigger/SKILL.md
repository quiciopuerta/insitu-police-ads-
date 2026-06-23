---
name: gsap-scrolltrigger
description: Official GSAP skill for ScrollTrigger — scroll-linked animations, pinning, scrubbing, triggers, parallax.
license: MIT
---

# GSAP ScrollTrigger

## When to Use This Skill

Apply when implementing scroll-driven animations: triggering tweens on scroll, pinning, scrubbing, parallax.

**Related skills:** For tweens use **gsap-core**; for React cleanup use **gsap-react**; for performance use **gsap-performance**.

## Registration

```javascript
gsap.registerPlugin(ScrollTrigger);
```

## Basic Trigger

```javascript
gsap.to(".box", {
  x: 500,
  scrollTrigger: {
    trigger: ".box",
    start: "top center",
    end: "bottom center",
    toggleActions: "play reverse play reverse"
  }
});
```

## Key Config Options

| Property | Description |
|----------|-------------|
| **trigger** | Element whose position defines start |
| **start/end** | Format: `"triggerPos viewportPos"` (e.g. `"top center"`) |
| **scrub** | `true` = direct link; number = smoothing seconds |
| **pin** | `true` pins trigger element while active |
| **pinSpacing** | Default `true`; adds spacer for layout |
| **toggleActions** | `"onEnter onLeave onEnterBack onLeaveBack"` |
| **markers** | Dev markers (remove in production) |
| **snap** | Snap to progress values |
| **containerAnimation** | For fake horizontal scroll |
| **once** | Kill after first trigger |

## Scrubbing

```javascript
scrollTrigger: {
  trigger: ".box",
  start: "top center",
  end: "bottom center",
  scrub: true    // or number for smooth lag
}
```

## Pinning

```javascript
scrollTrigger: {
  trigger: ".section",
  start: "top top",
  end: "+=1000",
  pin: true,
  scrub: 1
}
```

## Timeline + ScrollTrigger

```javascript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: ".container",
    start: "top top",
    end: "+=2000",
    scrub: 1,
    pin: true
  }
});
tl.to(".a", { x: 100 })
  .to(".b", { y: 50 })
  .to(".c", { opacity: 0 });
```

## ScrollTrigger.batch()

```javascript
ScrollTrigger.batch(".box", {
  onEnter: (elements) => {
    gsap.to(elements, { opacity: 1, y: 0, stagger: 0.15 });
  },
  start: "top 80%"
});
```

## Horizontal Scroll (containerAnimation)

```javascript
const scrollTween = gsap.to(".horizontal-wrap", {
  xPercent: -100,
  ease: "none",  // REQUIRED
  scrollTrigger: {
    trigger: ".horizontal-wrap",
    pin: true,
    scrub: true,
    end: "+=1000"
  }
});
```

**Critical:** horizontal tween MUST use `ease: "none"`.

## Refresh and Cleanup

```javascript
ScrollTrigger.refresh();  // After DOM/layout changes
ScrollTrigger.getAll().forEach(t => t.kill());
ScrollTrigger.getById("my-id")?.kill();
```

## Best Practices

- ✅ Register plugin before use
- ✅ Call `refresh()` after layout changes
- ✅ Use `useGSAP()` in React for auto-cleanup
- ✅ Use scrub OR toggleActions, not both
- ✅ Create ScrollTriggers top-to-bottom or use `refreshPriority`

## Do Not

- ❌ Put ScrollTrigger on child tweens in a timeline — put on the timeline itself
- ❌ Nest ScrollTriggered animations inside parent timelines
- ❌ Use ease other than `"none"` with containerAnimation
- ❌ Leave `markers: true` in production
- ❌ Forget `refresh()` after dynamic content changes

### Learn More

https://gsap.com/docs/v3/Plugins/ScrollTrigger/
