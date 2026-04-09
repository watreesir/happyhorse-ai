import { getEmailService } from '@/shared/services/email';

async function main() {
  const to = process.argv[2];

  if (!to) {
    throw new Error('Missing recipient email. Usage: pnpm exec tsx --env-file=.env.production.local scripts/send-test-email.ts you@example.com');
  }

  const emailService = await getEmailService();
  const result = await emailService.sendEmail({
    to,
    subject: 'Happy Horse AI email test',
    text: 'This is a direct delivery test from Happy Horse AI.',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;padding:24px">
        <h2 style="margin:0 0 12px">Happy Horse AI email test</h2>
        <p style="margin:0 0 10px">This is a direct delivery test from Happy Horse AI.</p>
        <p style="margin:0;color:#6b7280">If you received this message, the current Postmark delivery path is working.</p>
      </div>
    `,
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
