// Shared interface detection and auto-switching logic
// Used by both desktop and mobile interfaces

(function () {
  function detectMobile() {
    const isMobileScreen = window.innerWidth < 768;
    const isTouchDevice = "ontouchstart" in window;
    const isMobileUA =
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return isMobileScreen || (isTouchDevice && isMobileUA);
  }

  function detectDesktop() {
    const isDesktopScreen = window.innerWidth >= 768;
    const isNotTouchDevice = !("ontouchstart" in window);
    const isDesktopUA =
      !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    return isDesktopScreen && (isNotTouchDevice || isDesktopUA);
  }

  function autoRedirectToMobile() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasDesktopParam = urlParams.has("d");

    // Respect manual overrides - if ?d is present, stay on desktop
    if (hasDesktopParam) return;

    // If mobile is detected and no explicit desktop request
    if (detectMobile() && !hasDesktopParam) {
      // Add ?m parameter to current URL
      const url = new URL(window.location);
      url.searchParams.set("m", "");
      // Remove any conflicting parameters
      url.searchParams.delete("d");
      window.location.href = url.toString();
    }
  }

  function autoRedirectToDesktop() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasMobileParam = urlParams.has("m");

    // Respect manual overrides - if ?m is present, stay on mobile
    if (hasMobileParam) return;

    // If we detect desktop conditions
    if (detectDesktop() && !hasMobileParam) {
      // Add ?d parameter to current URL
      const url = new URL(window.location);
      url.searchParams.set("d", "");
      // Remove any conflicting parameters
      url.searchParams.delete("m");
      window.location.href = url.toString();
    }
  }

  function runAutoDetection() {
    // Determine which detection to run based on current interface
    // This is determined by checking if we're serving mobile or desktop HTML
    const isMobileInterface = document.querySelector("mobile-shell") !== null;

    if (isMobileInterface) {
      autoRedirectToDesktop();
    } else {
      autoRedirectToMobile();
    }
  }

  // iOS Safari viewport height fix
  function fixIOSViewportHeight() {
    // Only apply on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      // Set CSS custom property with actual viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);

      // Update on orientation change
      window.addEventListener("orientationchange", () => {
        setTimeout(() => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty("--vh", `${vh}px`);
        }, 100);
      });

      // Update on resize
      window.addEventListener("resize", () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      });
    }
  }

  // Run detection when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      runAutoDetection();
      fixIOSViewportHeight();
    });
  } else {
    runAutoDetection();
    fixIOSViewportHeight();
  }
})();
