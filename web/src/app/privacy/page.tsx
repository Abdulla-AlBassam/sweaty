import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Sweaty app.',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Effective date: 12 April 2026
      </p>

      <div className="mt-10 space-y-8 text-[var(--foreground-muted)] leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-3">
        <section>
          <h2>1. Introduction</h2>
          <p>
            Sweaty (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
            operates the Sweaty mobile application and the website at
            sweaty-v1.vercel.app (together, the &ldquo;Service&rdquo;). This
            Privacy Policy explains what information we collect, how we use it,
            and your rights regarding that information.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3 className="mt-4 mb-2 font-medium text-white/80">
            a) Information you provide
          </h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white/90">Account details:</strong> email
              address, username, display name, bio, and avatar image.
            </li>
            <li>
              <strong className="text-white/90">Gaming profile:</strong> gaming
              platforms (PlayStation, Xbox, PC, Nintendo), favourite games, and
              profile banner.
            </li>
            <li>
              <strong className="text-white/90">Game logs:</strong> games you
              add to your library, including status, rating, review text,
              platform, hours played, and dates.
            </li>
            <li>
              <strong className="text-white/90">Social activity:</strong> users
              you follow, review likes, and comments.
            </li>
            <li>
              <strong className="text-white/90">Custom lists:</strong> game
              lists you create, including titles, descriptions, and ordering.
            </li>
          </ul>

          <h3 className="mt-4 mb-2 font-medium text-white/80">
            b) Information from third-party platforms
          </h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white/90">Apple Sign-In:</strong> if you
              sign in with Apple, we receive your Apple-provided user identifier
              and, if you choose to share it, your email address.
            </li>
            <li>
              <strong className="text-white/90">Platform imports:</strong> if
              you connect your Steam or PlayStation account, we import your game
              library (titles, playtime, achievements) to match against our
              catalogue. OAuth tokens are stored securely and used only to sync
              your library.
            </li>
          </ul>

          <h3 className="mt-4 mb-2 font-medium text-white/80">
            c) Information collected automatically
          </h3>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white/90">Push notification tokens:</strong>{' '}
              if you enable notifications, we store your Expo push token to
              deliver alerts about new followers, friend activity, and streak
              reminders.
            </li>
            <li>
              <strong className="text-white/90">Usage analytics:</strong> we use
              Vercel Speed Insights on the web to collect anonymous performance
              metrics. No personally identifiable information is included.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>To provide and maintain the Service.</li>
            <li>
              To personalise your experience, including game recommendations and
              activity feeds.
            </li>
            <li>
              To send push notifications you have opted into (new followers,
              friend activity, streak reminders).
            </li>
            <li>
              To process subscription payments through Apple App Store or Google
              Play (we do not handle payment card details directly).
            </li>
            <li>To detect and prevent fraud or abuse.</li>
            <li>To respond to support requests.</li>
          </ul>
        </section>

        <section>
          <h2>4. Subscription Data</h2>
          <p>
            Subscription purchases are processed by Apple or Google. We use
            RevenueCat to manage subscription state. RevenueCat receives your
            anonymous app user identifier and purchase receipts to verify
            entitlements. We store your subscription tier and expiry date in our
            database. We do not have access to your payment card or billing
            details.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>We do not sell your personal information. We share data only with:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white/90">Supabase</strong> (database and
              authentication hosting).
            </li>
            <li>
              <strong className="text-white/90">RevenueCat</strong>{' '}
              (subscription management).
            </li>
            <li>
              <strong className="text-white/90">Expo / EAS</strong> (push
              notification delivery and app builds).
            </li>
            <li>
              <strong className="text-white/90">Vercel</strong> (web hosting and
              serverless API functions).
            </li>
            <li>
              <strong className="text-white/90">Apple / Google</strong>{' '}
              (authentication and in-app purchases).
            </li>
          </ul>
          <p className="mt-3">
            Game metadata is fetched from IGDB, OpenCritic, Twitch, and YouTube.
            These services receive API requests from our servers, not from your
            device, and no personal user data is sent to them.
          </p>
        </section>

        <section>
          <h2>6. Data Storage and Security</h2>
          <p>
            Your data is stored in a Supabase-managed PostgreSQL database with
            row-level security (RLS) enabled. All connections use TLS
            encryption. OAuth tokens for platform imports are stored securely and
            are never exposed to client applications.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You may at any time:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-white/90">Access and edit</strong> your
              profile, game logs, reviews, and lists through the app settings.
            </li>
            <li>
              <strong className="text-white/90">Delete your account</strong>{' '}
              through the app. This permanently removes your profile, game logs,
              reviews, lists, follows, comments, and notification tokens.
            </li>
            <li>
              <strong className="text-white/90">Manage notifications</strong> by
              toggling individual categories in the app settings or by disabling
              notifications at the device level.
            </li>
            <li>
              <strong className="text-white/90">Disconnect platforms</strong>{' '}
              (Steam, PlayStation) which revokes stored tokens and removes
              imported data.
            </li>
            <li>
              <strong className="text-white/90">Request a data export</strong>{' '}
              by contacting us at the address below.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. If you
            delete your account, all associated data is permanently removed
            within 30 days. Anonymous, aggregated statistics (such as community
            game ratings) may be retained indefinitely.
          </p>
        </section>

        <section>
          <h2>9. Children&rsquo;s Privacy</h2>
          <p>
            The Service is not directed at children under 13. We do not
            knowingly collect personal information from children under 13. If
            you believe a child has provided us with personal data, please
            contact us and we will delete it promptly.
          </p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material
            changes will be communicated through the app or via email. The
            effective date at the top of this page will be updated accordingly.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise
            your data rights, contact us at{' '}
            <a
              href="mailto:support@sweaty.gg"
              className="text-[var(--accent)] hover:underline"
            >
              support@sweaty.gg
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
