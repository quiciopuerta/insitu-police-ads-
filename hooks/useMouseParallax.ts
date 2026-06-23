import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook that tracks mouse position and updates global CSS variables.
 * Uses requestAnimationFrame + linear interpolation for buttery smooth movement.
 * Respects prefers-reduced-motion and disables on mobile.
 */
export function useMouseParallax(maxRotation: number = 10): void {
    const targetRef = useRef({ rotateX: 0, rotateY: 0, mouseX: 0, mouseY: 0 });
    const currentRef = useRef({ rotateX: 0, rotateY: 0, mouseX: 0, mouseY: 0 });
    const rafRef = useRef<number>(0);
    const isEnabledRef = useRef(true);

    const lerp = useCallback((start: number, end: number, factor: number) => {
        return start + (end - start) * factor;
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) {
            isEnabledRef.current = false;
            return;
        }

        const checkMobile = () => {
            isEnabledRef.current = window.innerWidth >= 768;
            if (!isEnabledRef.current) {
                // Reset variables on mobile
                document.documentElement.style.setProperty('--rx', `0deg`);
                document.documentElement.style.setProperty('--ry', `0deg`);
                document.documentElement.style.setProperty('--mx', `0px`);
                document.documentElement.style.setProperty('--my', `0px`);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        const handleMouseMove = (e: MouseEvent) => {
            if (!isEnabledRef.current) return;

            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const normalizedX = (e.clientX - centerX) / centerX;
            const normalizedY = (e.clientY - centerY) / centerY;

            targetRef.current = {
                rotateX: -normalizedY * maxRotation,
                rotateY: normalizedX * maxRotation,
                mouseX: e.clientX,
                mouseY: e.clientY,
            };
        };

        const animate = () => {
            if (!isEnabledRef.current) {
                rafRef.current = requestAnimationFrame(animate);
                return;
            }

            const lerpFactor = 0.08;
            currentRef.current = {
                rotateX: lerp(currentRef.current.rotateX, targetRef.current.rotateX, lerpFactor),
                rotateY: lerp(currentRef.current.rotateY, targetRef.current.rotateY, lerpFactor),
                mouseX: lerp(currentRef.current.mouseX, targetRef.current.mouseX, 0.15),
                mouseY: lerp(currentRef.current.mouseY, targetRef.current.mouseY, 0.15),
            };

            // Update CSS variables directly on document element for zero-latency UI
            const root = document.documentElement;
            root.style.setProperty('--rx', `${currentRef.current.rotateX.toFixed(2)}deg`);
            root.style.setProperty('--ry', `${currentRef.current.rotateY.toFixed(2)}deg`);
            root.style.setProperty('--mx', `${currentRef.current.mouseX.toFixed(2)}px`);
            root.style.setProperty('--my', `${currentRef.current.mouseY.toFixed(2)}px`);

            rafRef.current = requestAnimationFrame(animate);
        };

        document.addEventListener('mousemove', handleMouseMove);
        rafRef.current = requestAnimationFrame(animate);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', checkMobile);
            cancelAnimationFrame(rafRef.current);
        };
    }, [maxRotation, lerp]);
}
