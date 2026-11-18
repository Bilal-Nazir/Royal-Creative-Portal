const ASPECT_RATIO = 66.3 / 220;

export interface LogoProps {
  width?: number;
  className?: string;
}

export function Logo({ width = 220, className }: LogoProps) {
  return (
    <img
      src="/brand/royal-creative-logo.svg"
      alt="Royal Creative"
      width={width}
      height={Math.round(width * ASPECT_RATIO)}
      className={className}
    />
  );
}
