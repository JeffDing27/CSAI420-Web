import { NextResponse } from 'next/server';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

export async function POST(request: Request) {
  const twiml = new VoiceResponse();
  
  const gather = twiml.gather({
    input: ['speech', 'dtmf'],
    action: '/api/voice/auth',
    numDigits: 10,
    timeout: 5
  });
  
  gather.say(
    { voice: 'Polly.Joanna' },
    'Welcome to the STEDI Mobility Coach. To verify your identity, please enter or say the phone number associated with your account.'
  );

  twiml.say(
    { voice: 'Polly.Joanna' },
    'We didn\'t receive any input. Goodbye!'
  );
  
  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
