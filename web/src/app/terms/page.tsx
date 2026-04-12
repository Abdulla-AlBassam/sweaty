import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms of Use for the Sweaty app.',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms of Use</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Effective date: 12 April 2026
      </p>

      <div className="mt-10 space-y-8 text-[var(--foreground-muted)] leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-3">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By downloading, installing, or using the Sweaty mobile application or
            visiting sweaty-v1.vercel.app (together, the &ldquo;Service&rdquo;),
            you agree to be bound by these Terms of Use. If you do not agree, do
            not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Sweaty is a video game tracking application that allows users to log
            games they have played, rate and review them, create custom lists,
            follow other users, and discover new titles through curated
            recommendations and community activity.
          </p>
        </section>

        <section>
          <h2>3. Accounts</h2>
          <p>
            You must create an account to use most features of the Service. You
            are responsible for maintaining the confidentiality of your
            credentials and for all activity that occurs under your account. You
            agree to provide accurate information and to update it as necessary.
          </p>
        </section>

        <section>
          <h2>4. User Content</h2>
          <p>
            You retain ownership of any content you submit, including reviews,
            ratings, lists, and profile information. By posting content you grant
            Sweaty a non-exclusive, royalty-free, worldwide licence to display
            and distribute that content within the Service. You must not post
            content that is unlawful, defamatory, harassing, or infringes the
            rights of others.
          </p>
        </section>

        <section>
          <h2>5. Subscriptions and Payments</h2>
          <p>
            Sweaty offers an optional &ldquo;Supporter&rdquo; subscription
            available as a monthly or yearly auto-renewing plan. Key terms:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Payment is charged to your Apple App Store or Google Play account
              at confirmation of purchase.
            </li>
            <li>
              Subscriptions automatically renew unless cancelled at least 24
              hours before the end of the current billing period.
            </li>
            <li>
              You can manage or cancel your subscription at any time through your
              device&rsquo;s subscription settings (App Store &gt; Apple ID &gt;
              Subscriptions, or Google Play &gt; Payments &amp; subscriptions).
            </li>
            <li>
              No refunds are provided for partial billing periods. Refund
              requests are handled by Apple or Google in accordance with their
              respective policies.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable law.
            </li>
            <li>
              Attempt to gain unauthorised access to accounts, systems, or data.
            </li>
            <li>
              Interfere with or disrupt the Service, servers, or connected
              networks.
            </li>
            <li>
              Scrape, crawl, or harvest data from the Service by automated means
              without prior written consent.
            </li>
            <li>
              Impersonate another person or misrepresent your affiliation with
              any entity.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Third-Party Services</h2>
          <p>
            The Service integrates with third-party platforms including Steam,
            PlayStation Network, IGDB, OpenCritic, Twitch, and YouTube to
            provide game data, import functionality, and media content. Your use
            of those platforms is governed by their own terms and policies.
            Sweaty is not responsible for the availability or accuracy of
            third-party data.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            Game metadata, cover art, screenshots, and related media are the
            property of their respective publishers and are displayed under fair
            use for informational purposes. The Sweaty name, logo, and original
            interface design are the property of Sweaty.
          </p>
        </section>

        <section>
          <h2>9. Account Termination</h2>
          <p>
            You may delete your account at any time through the app settings.
            Sweaty reserves the right to suspend or terminate accounts that
            violate these Terms. Upon termination, your data will be deleted in
            accordance with our Privacy Policy.
          </p>
        </section>

        <section>
          <h2>10. Disclaimers</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether express or
            implied. Sweaty does not guarantee that the Service will be
            uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Sweaty shall not be liable
            for any indirect, incidental, special, consequential, or punitive
            damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will
            be communicated through the app or via email. Continued use of the
            Service after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            If you have questions about these Terms, contact us at{' '}
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
