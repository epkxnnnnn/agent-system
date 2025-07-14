import { Resend } from 'resend';
import { env } from '@/lib/config/env';

const resend = new Resend(env.email.resendApiKey);

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from
}: EmailMessage) {
  try {
    const emailData: any = {
      from: from || env.email.fromEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
    };

    // Add content based on what's provided
    if (html) {
      emailData.html = html;
    } else if (text) {
      emailData.text = text;
    } else {
      emailData.text = subject; // Fallback to subject as text
    }

    const response = await resend.emails.send(emailData);
    
    return {
      success: true,
      messageId: response.data?.id,
      error: response.error
    };
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function sendBulkEmail(messages: EmailMessage[]) {
  try {
    const results = await Promise.allSettled(
      messages.map(msg => sendEmail(msg))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      success: true,
      sent: successful,
      failed,
      results
    };
  } catch (error: any) {
    console.error('Bulk email error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}