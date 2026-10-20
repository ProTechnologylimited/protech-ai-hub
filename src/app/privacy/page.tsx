import Link from "next/link";

export const metadata = { title: "Privacy | Protech AI Hub" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-fg">
      <Link href="/" className="text-sm text-violet-soft underline underline-offset-4">
        Back to Protech AI Hub
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Privacy notice</h1>
      <p className="mt-2 text-sm text-muted">Protech AI Hub is operated by ProTechnology Limited.</p>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-bold">What we store</h2>
        <p>
          When you sign in through Farcaster we store your Farcaster ID (FID), the date your account was created, and
          how many generations you have used each day. When you generate content, we save the inputs you entered, the
          generated result, the model name and the time, so you can see it in your history. You can delete any saved
          result in the History tab. We keep a limited number of recent results per person and remove the oldest
          beyond that.
        </p>
        <p>
          We do not ask for or store wallet private keys, seed phrases or passwords. Never paste them into this app.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-bold">How AI processing works</h2>
        <p>
          The text you enter in a tool is sent from our server to a third-party AI provider to produce a draft. Do not
          enter private messages, confidential information or personal data you do not want processed by that provider.
          Only paste public posts into the Reply Assistant. The app cannot read private messages and never posts on
          your behalf.
        </p>
        <p>
          Generated text is a draft. It can be inaccurate or incomplete. Review and edit it before you publish, and do
          not publish claims you cannot support.
        </p>
      </section>

      <section className="mt-8 space-y-3 leading-relaxed">
        <h2 className="text-xl font-bold">Limits and your choices</h2>
        <p>
          Each person has a daily generation allowance. Delete saved results at any time from the History tab. To have
          your account data removed, contact ProTechnology Limited using the support details published with this app.
        </p>
      </section>
    </main>
  );
}
