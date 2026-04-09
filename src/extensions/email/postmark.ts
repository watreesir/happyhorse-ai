import { render } from '@react-email/components';

import type {
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

export interface PostmarkConfigs extends EmailConfigs {
  serverToken: string;
  defaultFrom?: string;
  messageStream?: string;
  apiBaseUrl?: string;
}

type PostmarkAttachment = {
  Name: string;
  Content: string;
  ContentType?: string;
};

type PostmarkHeader = {
  Name: string;
  Value: string;
};

type PostmarkPayload = {
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  ReplyTo?: string;
  Headers?: PostmarkHeader[];
  Attachments?: PostmarkAttachment[];
  MessageStream?: string;
  Tag?: string;
};

type PostmarkResponse = {
  ErrorCode?: number;
  Message?: string;
  MessageID?: string;
};

function toRecipientList(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(',') : value;
}

function normalizeAttachments(email: EmailMessage): PostmarkAttachment[] | undefined {
  if (!email.attachments?.length) return undefined;

  return email.attachments.map((attachment) => ({
    Name: attachment.filename,
    Content:
      typeof attachment.content === 'string'
        ? Buffer.from(attachment.content).toString('base64')
        : attachment.content.toString('base64'),
    ContentType: attachment.contentType,
  }));
}

function normalizeHeaders(email: EmailMessage): PostmarkHeader[] | undefined {
  if (!email.headers) return undefined;

  return Object.entries(email.headers).map(([Name, Value]) => ({
    Name,
    Value,
  }));
}

export class PostmarkProvider implements EmailProvider {
  readonly name = 'postmark';
  configs: PostmarkConfigs;

  constructor(configs: PostmarkConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const html = email.react ? await render(email.react) : email.html;
      const payload: PostmarkPayload = {
        From: email.from || this.configs.defaultFrom || '',
        To: toRecipientList(email.to) || '',
        Subject: email.subject,
        HtmlBody: html,
        TextBody: email.text,
        ReplyTo: email.replyTo,
        Cc: toRecipientList(email.cc),
        Bcc: toRecipientList(email.bcc),
        Headers: normalizeHeaders(email),
        Attachments: normalizeAttachments(email),
        MessageStream: this.configs.messageStream || 'outbound',
        Tag: email.tags?.[0],
      };

      if (!payload.From) {
        throw new Error('Postmark sender email is not configured');
      }

      if (!payload.To) {
        throw new Error('Postmark recipient is missing');
      }

      const response = await fetch(
        `${this.configs.apiBaseUrl || 'https://api.postmarkapp.com'}/email`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Postmark-Server-Token': this.configs.serverToken,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = (await response.json().catch(() => ({}))) as PostmarkResponse;

      if (!response.ok || (result.ErrorCode && result.ErrorCode !== 0)) {
        return {
          success: false,
          error:
            result.Message ||
            `Postmark request failed with status ${response.status}`,
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: result.MessageID,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

export function createPostmarkProvider(configs: PostmarkConfigs): PostmarkProvider {
  return new PostmarkProvider(configs);
}
