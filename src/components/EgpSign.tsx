interface EgpSignProps {
  size?: number | string;
  className?: string;
}

// Drop-in replacement for the lucide `DollarSign` icon, rendering the local
// currency code instead of a `$`. textLength pins the glyphs to the box width
// so they fill it regardless of the inherited font's metrics, and never clip.
export default function EgpSign({ size = 24, className = '' }: EgpSignProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="15"
        fontWeight="700"
        textLength="25"
        lengthAdjust="spacingAndGlyphs"
        fill="currentColor"
      >
        EGP
      </text>
    </svg>
  );
}
