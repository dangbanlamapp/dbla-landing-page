"use client";

import { useEffect, useRef, useState } from "react";

const RESET_MS = 2000;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block size-[1em] shrink-0"
    >
      {children}
    </svg>
  );
}

/**
 * Two offset rounded rects — the back sheet only draws the corner that shows,
 * so the front rect does not have to be knocked out of it with a mask.
 */
const CopyIcon = (
  <Icon>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

const CheckIcon = (
  <Icon>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const scratch = document.createElement("textarea");
    scratch.value = text;
    scratch.readOnly = true;
    scratch.setAttribute("aria-hidden", "true");
    scratch.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand("copy");
    scratch.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function CopyButton({
  value,
  label,
  className = "",
  children,
}: {
  value: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = async () => {
    if (!(await copyText(value))) return;

    if (timer.current) clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), RESET_MS);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className={`flex cursor-pointer items-center gap-space--2x text-white transition-colors hover:text-foreground focus-visible:text-foreground ${className}`}
    >
      <span className="flex items-center text-sm">
        {copied ? CheckIcon : CopyIcon}

        <span role="status" className="ml-space--3x empty:ml-0">
          {copied ? "copied" : ""}
        </span>
      </span>

      {children}
    </button>
  );
}
