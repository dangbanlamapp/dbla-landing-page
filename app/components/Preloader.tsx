"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import NumberFlow from "@number-flow/react";
import Image from "next/image";
import DashedRing from "./DashedRing";
import rutineMockup from "@/public/rutine-mockup.jpg";
import egguApp from "@/public/eggu-app.jpg";
import tgfMockup from "@/public/tgf-mockup.jpg";
import adminlessMockup from "@/public/adminless-mockup.jpg";

const MOCKUPS = [rutineMockup, egguApp, tgfMockup, adminlessMockup];

gsap.registerPlugin(useGSAP);

const RING = "80vh";

const RING_FROM = "calc(100vw + 100vh)";

const FRAME = "30vh";

const PAUSE: boolean = false;

const COUNT = 1.6;
const HOLD = 0.15;
const COUNTER_EXIT = 0.35;
const COLLAPSE = 0.9;

const COUNT_EASE = "back.out(0.9)";

const PHOTO_GROW = 0.35;

const PHOTO_SPREAD = 0.75;

const PHOTO_CADENCE = "none";

const PHOTO_EASE = "power2.out";

const RING_IN = COUNT;

const RING_SPIN = 180;

const RING_EASE = "power3.out";

const CURTAIN_AT = HOLD + COUNTER_EXIT / 2;

const ASSET_TIMEOUT_MS = 3000;

const PHOTO_TIMEOUT_MS = 1500;

const decoded = (img: HTMLImageElement): Promise<unknown> => {
  if (typeof img.decode === "function") {
    return img.decode().catch(() => undefined);
  }
  if (img.complete) return Promise.resolve(undefined);
  return new Promise((done) => {
    img.addEventListener("load", () => done(undefined), { once: true });
    img.addEventListener("error", () => done(undefined), { once: true });
  });
};

const COUNTER_TRANSFORM: EffectTiming = {
  duration: 120,
};
const COUNTER_OPACITY: EffectTiming = { duration: 100, easing: "ease-out" };

const CURTAIN = {
  covering: "circle(75% at 50% 50%)",
  gone: "circle(0% at 50% 50%)",
};

const RevealContext = createContext(true);

export const useRevealed = () => useContext(RevealContext);

let hasPlayed = false;

export default function Preloader({ children }: { children: React.ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);

  const [revealed, setRevealed] = useState(hasPlayed);
  const [done, setDone] = useState(hasPlayed);

  const [percent, setPercent] = useState(0);
  const shown = useRef(0);

  const reveal = useCallback(() => {
    hasPlayed = true;
    setRevealed(true);
  }, []);

  useGSAP(
    () => {
      if (hasPlayed) return;

      if (
        !PAUSE &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        reveal();
        setDone(true);
        return;
      }

      const progress = { value: 0 };

      let cancelled = false;
      let counted = false;
      let assetsIn = false;

      const exit = gsap.timeline({
        paused: true,
        onComplete: () => setDone(true),
      });

      exit
        .to(
          counter.current,
          {
            autoAlpha: 0,
            yPercent: -40,
            duration: COUNTER_EXIT,
            ease: "power2.in",
          },
          HOLD,
        )
        .fromTo(
          curtain.current,
          { clipPath: CURTAIN.covering },
          {
            clipPath: CURTAIN.gone,
            duration: COLLAPSE,
            ease: "power4.inOut",
          },
          CURTAIN_AT,
        );

      const open = () => {
        if (cancelled || PAUSE || !counted || !assetsIn) return;

        reveal();
        exit.play();
      };

      const intro = gsap.timeline({
        paused: true,
        onComplete: () => {
          counted = true;
          open();
        },
      });

      intro
        .to(
          progress,
          {
            value: 100,
            duration: COUNT,
            ease: COUNT_EASE,
            onUpdate: () => {
              const next = Math.round(progress.value);
              if (next === shown.current) return;
              shown.current = next;
              setPercent(next);
            },
          },
          0,
        )
        .to(
          "[data-ring-box]",
          {
            height: RING,
            rotate: RING_SPIN,
            duration: RING_IN,
            ease: RING_EASE,
          },
          0,
        )
        .fromTo(
          "[data-preload-photo]",
          { scale: 0 },
          {
            scale: 1,
            duration: PHOTO_GROW,
            ease: PHOTO_EASE,
            stagger: { amount: PHOTO_SPREAD, ease: PHOTO_CADENCE },
          },
          0,
        );

      let startTimer = 0;
      let started = false;
      const startIntro = () => {
        if (cancelled || started) return;
        started = true;
        window.clearTimeout(startTimer);
        intro.play();
      };

      const photos = Array.from(
        overlay.current?.querySelectorAll<HTMLImageElement>(
          "[data-preload-photo] img",
        ) ?? [],
      );

      startTimer = window.setTimeout(startIntro, PHOTO_TIMEOUT_MS);
      Promise.all(photos.map(decoded)).then(startIntro);

      let timer = 0;
      let settled = false;
      const assetsReady = () => {
        if (cancelled || settled) return;
        settled = true;
        window.clearTimeout(timer);
        assetsIn = true;
        open();
      };

      timer = window.setTimeout(assetsReady, ASSET_TIMEOUT_MS);
      document.fonts.ready.then(assetsReady);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        window.clearTimeout(startTimer);
      };
    },
    { scope: overlay },
  );

  return (
    <RevealContext.Provider value={revealed}>
      {!done && (
        <div
          ref={overlay}
          aria-hidden
          className="fixed inset-0 z-90 flex items-center justify-center"
        >
          <div
            ref={curtain}
            style={{ clipPath: CURTAIN.covering }}
            className="absolute inset-0 bg-accent"
          >
            <DashedRing weight={2} gap={6} dash={6} size={RING_FROM} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                data-preload-frame
                style={{ height: FRAME }}
                className="relative aspect-square overflow-hidden rounded-full"
              >
                {MOCKUPS.map((mockup) => (
                  <div
                    key={mockup.src}
                    data-preload-photo
                    className="absolute inset-0 scale-0 overflow-hidden rounded-full"
                  >
                    <Image
                      src={mockup}
                      alt=""
                      fill
                      sizes={FRAME}
                      priority
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="relative aspect-square" style={{ height: RING }}>
            <div className="absolute inset-x-0 bottom-space-2x flex justify-center">
              <p
                ref={counter}
                className="heading-style text-xl text-background lg:text-2xl"
              >
                <NumberFlow
                  value={percent}
                  format={{ minimumIntegerDigits: 2 }}
                  trend={0}
                  willChange
                  transformTiming={COUNTER_TRANSFORM}
                  opacityTiming={COUNTER_OPACITY}
                />
              </p>
            </div>
          </div>
        </div>
      )}
      {children}
    </RevealContext.Provider>
  );
}
