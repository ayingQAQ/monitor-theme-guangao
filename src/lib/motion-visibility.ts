// One observer for all decorative regions; no scroll handler or React renders.
let observer: IntersectionObserver | undefined;
export function observeMotion(element: HTMLElement | null) {
  if (!element || typeof IntersectionObserver === "undefined") return;
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries)
      (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting);
  }, { rootMargin: "80px" });
  observer.observe(element);
  return () => observer?.unobserve(element);
}
