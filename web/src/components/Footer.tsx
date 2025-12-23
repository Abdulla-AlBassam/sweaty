import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8">
      <div className="flex justify-center">
        <Link
          href="https://x.com/sweatyapp"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-[var(--accent)] transition-colors"
          aria-label="Follow us on X"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Link>
      </div>
    </footer>
  )
}
