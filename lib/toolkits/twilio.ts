import twilio from 'twilio';
import { env } from '@/lib/config/env';

const client = twilio(
  env.twilio.accountSid,
  env.twilio.authToken
);

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface VoiceCall {
  to: string;
  url: string;
  from?: string;
}

export async function sendSMS({ to, body, from }: SMSMessage) {
  try {
    const message = await client.messages.create({
      body,
      from: from || env.twilio.phoneNumber,
      to,
    });
    
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      price: message.price,
      direction: message.direction,
    };
  } catch (error: any) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function makeVoiceCall({ to, url, from }: VoiceCall) {
  try {
    const call = await client.calls.create({
      url,
      to,
      from: from || env.twilio.phoneNumber,
    });
    
    return {
      success: true,
      callId: call.sid,
      status: call.status,
      direction: call.direction,
    };
  } catch (error: any) {
    console.error('Voice call error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export function createTwiMLResponse(message: string, voice: string = 'alice') {
  return `
    <Response>
      <Say voice="${voice}">${message}</Say>
    </Response>
  `;
}

export function createTwiMLGatherResponse(
  message: string, 
  gatherUrl: string,
  voice: string = 'alice',
  timeout: number = 10
) {
  return `
    <Response>
      <Gather input="speech" action="${gatherUrl}" timeout="${timeout}" speechTimeout="auto">
        <Say voice="${voice}">${message}</Say>
      </Gather>
    </Response>
  `;
}