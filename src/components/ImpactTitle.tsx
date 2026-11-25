import type { CSSProperties } from 'react';

interface ImpactTitleProps {
  text?: string;
  size?: 'sm' | 'md';
  className?: string;
  style?: CSSProperties;
}

export function ImpactTitle({
  text = 'TicketSphere',
  size = 'md',
  className = '',
  style,
}: ImpactTitleProps) {
  const heightClass = size === 'sm' ? 'h-7 w-auto' : 'h-8 w-auto';

  return (
    <span
      className={`inline-flex items-center leading-none select-none ${className}`}
      style={style}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 46"
        role="img"
        aria-label={text}
        className={`${heightClass} overflow-visible`}
      >
        <defs>
          <radialGradient id="ts-im-flash" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ts-im-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
        </defs>

        <ellipse
          className="ts-im-flash"
          cx="116"
          cy="23"
          rx="115"
          ry="22"
          fill="url(#ts-im-flash)"
        />
        <circle
          className="ts-im-ring"
          style={{ animationDelay: '0.28s', transformOrigin: '116px 23px' }}
          cx="116"
          cy="23"
          r="9"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.5"
        />
        <circle
          className="ts-im-ring"
          style={{ animationDelay: '0.38s', transformOrigin: '116px 23px' }}
          cx="116"
          cy="23"
          r="9"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="2"
        />
        <g className="ts-im-word" style={{ transformOrigin: '116px 23px' }}>
          <text
            x="4"
            y="31"
            fontSize="26"
            fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
            fontWeight="800"
            letterSpacing="-0.5"
            fill="url(#ts-im-fill)"
          >
            {text}
          </text>
        </g>
      </svg>
    </span>
  );
}
