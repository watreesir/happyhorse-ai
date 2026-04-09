import { EmailManager, PostmarkProvider, ResendProvider } from '@/extensions/email';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get email service with configs
 */
export function getEmailServiceWithConfigs(configs: Configs) {
  const emailManager = new EmailManager();

  if (configs.postmark_server_token) {
    emailManager.addProvider(
      new PostmarkProvider({
        serverToken: configs.postmark_server_token,
        defaultFrom: configs.postmark_from_email,
        messageStream: configs.postmark_message_stream || 'outbound',
      }),
      true
    );
  }

  if (configs.resend_api_key) {
    emailManager.addProvider(
      new ResendProvider({
        apiKey: configs.resend_api_key,
        defaultFrom: configs.resend_sender_email,
      }),
      !configs.postmark_server_token
    );
  }

  return emailManager;
}

/**
 * global email service
 */
let emailService: EmailManager | null = null;

/**
 * get email service instance
 */
export async function getEmailService(
  configs?: Configs
): Promise<EmailManager> {
  if (!configs) {
    configs = await getAllConfigs();
  }
  emailService = getEmailServiceWithConfigs(configs);

  return emailService;
}
