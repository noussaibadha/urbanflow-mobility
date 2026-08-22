import { Resend } from 'resend';

const FROM_ADDRESS = 'UrbanFlow Mobility <onboarding@resend.dev>';

export async function sendPasswordResetEmail(toEmail, resetLink) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: 'Réinitialisation de votre mot de passe UrbanFlow Mobility',
    html: `
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe UrbanFlow Mobility.</p>
      <p><a href="${resetLink}">Cliquez ici pour réinitialiser votre mot de passe</a></p>
      <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
    `,
  });

  // The Resend SDK resolves with { data, error } on API-level failures
  // (e.g. unverified domain, restricted test-mode recipient) instead of
  // throwing, so that must be checked explicitly or failures pass silently.
  if (error) {
    throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
  }
}
