// Molekula Academy symbol — "Prsten + M": a benzene hexagon with the letter M
// carved out of it. Single source for the header logo, favicon, and the faint
// lesson watermark. Geometry is locked (viewBox 100×100):
//   hexagon (pointy-top): 50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30
//   M polyline:           32,68 32,36 50,54 68,36 68,68
//
// variant:
//   'dark'      → on a deep-teal surface: bright-teal hexagon, deep-teal M  (header)
//   'light'     → on a light surface:     deep-teal hexagon, paper M        (favicon / light header)
//   'watermark' → outline only, very low opacity, sits behind lesson text

const HEX = '50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30';
const M = '32,68 32,36 50,54 68,36 68,68';

const PALETTE = {
  deep: '#0b343c',
  bright: '#1ec8b6',
  paper: '#fbfaf6',
};

export default function MolekulaMark({
  variant = 'dark',
  size = 32,
  className,
  title = 'Molekula Academy',
}) {
  let hexFill = PALETTE.deep;
  let mStroke = PALETTE.paper;
  let outline = false;

  if (variant === 'dark') {
    hexFill = PALETTE.bright;
    mStroke = PALETTE.deep;
  } else if (variant === 'watermark') {
    outline = true;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
      focusable="false"
    >
      {outline ? (
        <>
          <polygon points={HEX} fill="none" stroke={PALETTE.deep} strokeWidth="5" />
          <polyline
            points={M}
            fill="none"
            stroke={PALETTE.deep}
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <polygon points={HEX} fill={hexFill} />
          <polyline
            points={M}
            fill="none"
            stroke={mStroke}
            strokeWidth="7.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
