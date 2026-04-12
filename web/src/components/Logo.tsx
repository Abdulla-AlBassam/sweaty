// Three-disc logo mark, matching the mobile app and social branding
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  const scale = size / 220
  return (
    <svg
      width={280 * scale}
      height={size}
      viewBox="0 0 280 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Left disc */}
      <circle cx="90" cy="110" r="80" fill="#F0F0F0" />
      <circle cx="90" cy="110" r="24" fill="white" />
      <circle cx="90" cy="110" r="20" fill="#FAFAFA" />
      {/* Middle disc */}
      <circle cx="140" cy="110" r="80" fill="#C8C8C8" />
      <circle cx="140" cy="110" r="24" fill="white" />
      <circle cx="140" cy="110" r="20" fill="#EAEAEA" />
      {/* Right disc */}
      <circle cx="190" cy="110" r="80" fill="#A3A3A3" />
      <circle cx="190" cy="110" r="24" fill="white" />
      <circle cx="190" cy="110" r="20" fill="#E0E0E0" />
    </svg>
  )
}

// Full logo: disc mark + "sweaty" wordmark in Montserrat (matching mobile)
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-display font-bold tracking-[0.15em] uppercase text-[var(--foreground-bright)]"
        style={{ fontSize: size * 0.55, lineHeight: 1 }}
      >
        sweaty
      </span>
    </span>
  )
}
