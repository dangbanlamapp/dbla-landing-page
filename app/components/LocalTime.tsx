"use client";

import { useEffect, useState } from "react";

/**
 * A ticking wall clock for one IANA time zone, e.g. "Asia/Ho_Chi_Minh".
 *
 * The offset is read out of the zone rather than written next to it, so Paris
 * flips to GMT +2 on its own every spring — the whole reason to compute this
 * instead of typing "(GMT +7)" twice, which was also wrong for Paris and
 * carried a stray "PM" on a 24-hour reading.
 */

/**
 * Rendered on the server and on the client's first paint. Any real time would
 * differ between those two moments and trip a hydration mismatch, so the clock
 * cannot start until after mount — this is what stands in until then, and it
 * has to be byte-identical on both sides.
 */
const PLACEHOLDER = "--:--:--";

/**
 * `shortOffset` yields "GMT+7" already collapsed — no zero padding and no
 * ":00" on whole-hour zones, unlike `longOffset`'s "GMT+07:00" — so the only
 * thing left is the space the design puts after GMT. Zones on a half-hour step
 * still read correctly ("GMT+5:30").
 */
function format(timeZone: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "shortOffset",
  }).formatToParts(now);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const offset = at("timeZoneName").replace("GMT", "GMT ");

  return `${at("hour")}:${at("minute")}:${at("second")} (${offset})`;
}

export default function LocalTime({
  timeZone,
  className,
}: {
  timeZone: string;
  className?: string;
}) {
  const [time, setTime] = useState(PLACEHOLDER);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Re-armed to the next real second boundary each tick rather than left on
    // a plain 1000ms interval. setInterval drifts — its own scheduling jitter
    // accumulates, and a backgrounded tab's throttling can park it anywhere in
    // the second — which shows up as a clock that visibly skips a number or
    // holds one for two beats. Reading the clock after every tick also means
    // a machine waking from sleep resyncs on the next frame instead of
    // carrying the drift it accrued while suspended.
    const tick = () => {
      const now = new Date();
      setTime(format(timeZone, now));
      timer = setTimeout(tick, 1000 - (now.getTime() % 1000));
    };

    tick();
    return () => clearTimeout(timer);
  }, [timeZone]);

  // tabular-nums stops the row from twitching every second: the default
  // proportional figures make 1 narrower than 8, so the text either side of a
  // changing digit would shuffle. suppressHydrationWarning is not needed —
  // both sides render PLACEHOLDER and the first real value lands in an effect.
  return <span className={`tabular-nums ${className ?? ""}`}>{time}</span>;
}
