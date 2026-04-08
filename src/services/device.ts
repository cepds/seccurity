export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    return Promise.resolve();
  }

  return navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

export function scrollToElement(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function observeElements(
  selector: string,
  onVisible: (element: HTMLElement) => void,
  options?: IntersectionObserverInit
) {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (elements.length === 0) {
    return () => undefined;
  }

  const observer = new IntersectionObserver((entries) => {
    const visibleEntry = entries.find((entry) => entry.isIntersecting);
    if (visibleEntry && visibleEntry.target instanceof HTMLElement) {
      onVisible(visibleEntry.target);
    }
  }, options);

  elements.forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}
