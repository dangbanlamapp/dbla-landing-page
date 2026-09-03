// No "use client": the mark is static markup. Add the directive (and the
// useGSAP/scope shape the other sections use) only once it actually animates.

/**
 * Purely the mark and its link — Header owns where it sits. It carried the
 * `fixed` shell itself while it was a lone corner element; now that it is one
 * cell of the bar, positioning it from in here would fight the grid.
 *
 * public/logo.svg is inlined rather than pulled in through next/image, for the
 * same reason the footer wordmark is: the exported file hard-codes `black` on
 * every path, which is a colour outside the token system that no theme change
 * can reach. `currentColor` on the fill *and* the strokes hands it back to
 * Tailwind, so the colour is set once below with a real token class.
 *
 * width/height stay on the element alongside viewBox — that is what the
 * browser derives the intrinsic aspect ratio from, so `h-auto` has a ratio to
 * resolve against once the width class takes over.
 */
export default function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#"
      aria-label="DBLA — home"
      className={`block text-foreground ${className ?? ""}`}
    >
      <svg
        width="89"
        height="18"
        viewBox="0 0 89 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="DBLA"
        // `block` keeps the inline svg off the text baseline, which would
        // otherwise add a descender's worth of gap inside the anchor.
        className="block h-auto w-[89px]"
      >
        <path
          d="M0 8.49997L2.66667 8.49997C6.53266 8.49997 9.66667 5.36596 9.66667 1.49997L9.66667 0.5"
          stroke="currentColor"
          strokeWidth="7"
        />
        <path
          d="M19.3335 10.5L16.3334 10.5C12.4674 10.5 9.33343 13.634 9.33343 17.5"
          stroke="currentColor"
          strokeWidth="7"
        />
        <path
          d="M31.8407 17H24.8327V12.944H31.8407C32.8007 12.944 33.5607 12.864 34.1207 12.704C34.6807 12.544 35.0807 12.184 35.3207 11.624C35.5607 11.048 35.6807 10.16 35.6807 8.96C35.6807 7.744 35.5607 6.856 35.3207 6.296C35.0807 5.736 34.6807 5.376 34.1207 5.216C33.5607 5.056 32.8007 4.976 31.8407 4.976H24.8327V0.92H31.8407C33.6167 0.92 35.1527 1.24 36.4487 1.88C37.7447 2.504 38.7447 3.416 39.4487 4.616C40.1527 5.816 40.5047 7.264 40.5047 8.96C40.5047 10.656 40.1527 12.104 39.4487 13.304C38.7447 14.504 37.7447 15.424 36.4487 16.064C35.1527 16.688 33.6167 17 31.8407 17ZM28.2167 17H23.7047V0.92H28.2167V17ZM50.7945 17H40.0185V0.92H50.2425C51.4105 0.92 52.3785 1.072 53.1465 1.376C53.9145 1.664 54.4905 2.096 54.8745 2.672C55.2585 3.248 55.4505 3.96 55.4505 4.808C55.4505 5.832 55.1465 6.68 54.5385 7.352C53.9465 8.024 52.9145 8.392 51.4425 8.456V8.696C53.0585 8.76 54.2505 9.136 55.0185 9.824C55.8025 10.512 56.1945 11.416 56.1945 12.536C56.1945 13.432 56.0105 14.216 55.6425 14.888C55.2745 15.56 54.6905 16.08 53.8905 16.448C53.1065 16.816 52.0745 17 50.7945 17ZM44.5065 10.712V12.944H50.2185C50.7625 12.944 51.1305 12.872 51.3225 12.728C51.5305 12.568 51.6345 12.264 51.6345 11.816C51.6345 11.368 51.5385 11.072 51.3465 10.928C51.1545 10.784 50.7785 10.712 50.2185 10.712H44.5065ZM44.5065 4.976V7.016H49.7625C50.2265 7.016 50.5385 6.944 50.6985 6.8C50.8585 6.64 50.9385 6.376 50.9385 6.008C50.9385 5.64 50.8345 5.376 50.6265 5.216C50.4345 5.056 50.1065 4.976 49.6425 4.976H44.5065ZM59.9833 17H55.4713V0.92H59.9833V17ZM69.2713 17H56.7193V12.944H69.2713V17ZM72.8953 17H67.8313L74.7673 0.92H81.2233L88.1833 17H82.9993L79.1833 7.712L78.1273 5H77.8153L76.7833 7.712L72.8953 17ZM83.7913 14.024H71.9353V9.968H83.7913V14.024Z"
          fill="currentColor"
        />
      </svg>
    </a>
  );
}
