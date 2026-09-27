interface BrandSigilProps {
  className?: string;
}

/** Original FrightFate mark: a keyhole nested inside an eclipse and field-registration rings. */
export function BrandSigil({ className }: BrandSigilProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 72"
      fill="none"
      role="img"
      aria-label="FrightFate keyhole sigil"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="36" cy="36" r="31" stroke="currentColor" strokeOpacity=".35" />
      <circle cx="36" cy="36" r="25" stroke="currentColor" strokeOpacity=".75" strokeDasharray="1 4" />
      <path d="M36 14v7M36 51v7M14 36h7M51 36h7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M48.5 36a12.5 12.5 0 1 1-25 0 12.5 12.5 0 0 1 25 0Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M41 33.5a5 5 0 1 0-9.5 2.2c.5.9 1.2 1.5 2.1 2v6.1h4.8v-6.1c1.6-.9 2.6-2.4 2.6-4.2Z" fill="currentColor" />
      <path d="M27.3 26.3 24 23M44.7 26.3 48 23M27.3 45.7 24 49M44.7 45.7 48 49" stroke="currentColor" strokeOpacity=".55" />
    </svg>
  );
}
