import nodemailer from 'nodemailer';

interface EmailResult {
  sent: true;
  developmentUrl?: string;
}

interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM?.trim();
  const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureSetting ? secureSetting === 'true' : port === 465;

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !pass ||
    !from ||
    (secureSetting && secureSetting !== 'true' && secureSetting !== 'false')
  ) {
    return null;
  }

  return { host, port, user, pass, from, secure };
}

export function isOtpEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

function createSmtpTransport() {
  const config = smtpConfig();
  if (!config) {
    throw new Error(
      'Email SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, and EMAIL_FROM.',
    );
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

async function sendAuthEmail(input: OutgoingEmail): Promise<EmailResult> {
  const config = smtpConfig();
  if (!config) {
    throw new Error(
      'Email SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, and EMAIL_FROM.',
    );
  }

  try {
    const transporter = createSmtpTransport();
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { sent: true };
  } catch (error) {
    // Do not log message content or SMTP credentials.
    const message = error instanceof Error ? error.message : 'Unknown SMTP error';
    console.error('Sportrz email delivery failed:', message);
    throw error;
  }
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export async function sendVerificationEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  return sendAuthEmail({
    to: email,
    subject: 'Verify your Sportrz email',
    text: `Verify your Sportrz account by opening this link: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Welcome to Sportrz!</h2><p><a href="${url}">Verify your email address</a></p><p>This link expires in 30 minutes.</p></div>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendAuthEmail({
    to: email,
    subject: 'Reset your Sportrz password',
    text: `Reset your Sportrz password by opening this link: ${url}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>Password reset</h2><p>A password reset was requested for your Sportrz account.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, ignore this email.</p></div>`,
  });
}

export async function sendLoginOtpEmail(email: string, otp: string): Promise<{ sent: true }> {
  const subject = `${otp} is your Sportrz verification code`;
  const text = [
    'Your Sportrz verification code',
    '',
    `Your one-time code is: ${otp}`,
    '',
    'This code expires in 10 minutes and can be used only once.',
    'If you did not request this code, you can safely ignore this email.',
  ].join('\n');
  const html = `
    <div style="margin:0;padding:32px 12px;background:#fff7f2;font-family:Arial,Helvetica,sans-serif;color:#172033">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #f5ded4;border-radius:22px;overflow:hidden">
        <div style="padding:22px 28px;background:#f04a27;color:#fff">
          <div style="font-size:20px;font-weight:800;letter-spacing:4px">SPORTRZ</div>
          <div style="margin-top:5px;font-size:12px;color:#ffe6dd">YOUR WORLD OF GAMES</div>
        </div>
        <div style="padding:30px 28px">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">Your verification code</h1>
          <p style="margin:0;color:#526071;font-size:15px;line-height:1.7">Enter this one-time code on Sportrz to continue. New to Sportrz? Your account will be created automatically after you verify it.</p>
          <div style="margin:26px 0;padding:20px 12px;border:1px solid #ffd4c5;border-radius:16px;background:#fff7f2;text-align:center">
            <div style="font-size:34px;font-weight:800;letter-spacing:9px;color:#ed4325">${otp}</div>
          </div>
          <p style="margin:0;color:#526071;font-size:13px;line-height:1.7">This code expires in <strong>10 minutes</strong> and can be used only once.</p>
          <p style="margin:18px 0 0;color:#7b8491;font-size:12px;line-height:1.6">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </div>
    </div>`;

  try {
    await sendAuthEmail({ to: email, subject, text, html });
    return { sent: true };
  } catch {
    throw new Error('OTP email delivery failed. Check the SMTP hostname, port, mailbox credentials, and sender address.');
  }
}
