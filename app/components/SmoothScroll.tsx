"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState } from "react";
import ScrollLock from "./ScrollLock";

// Global smooth-scroll instance. `root` binds Lenis to the document scroller,
// so it renders no wrapper markup of its own and page layout is untouched.
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.05,
        // Readers who ask for less motion get the browser's own scroll; Lenis
        // stays mounted (so useLenis consumers keep working) but stops easing.
        smoothWheel: !reduced,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        // Let Lenis animate in-page `#anchor` links, clearing the fixed header.
        anchors: { offset: -80 },
      }}
    >
      {/* Inside the provider so it can reach the instance through useLenis;
          renders nothing of its own. Holds the page still while the entrance
          animation plays and pins a fresh load to the top. */}
      <ScrollLock />
      {children}
    </ReactLenis>
  );
}
