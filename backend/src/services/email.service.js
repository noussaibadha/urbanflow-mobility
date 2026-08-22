import { Resend } from 'resend';

const FROM_ADDRESS = 'UrbanFlow Mobility <onboarding@resend.dev>';

export async function sendPasswordResetEmail(toEmail, resetLink) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
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
}
