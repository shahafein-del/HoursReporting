import nodemailer from "nodemailer";
import webpush from "web-push";

// ─── HTML Escaping ────────────────────────────────────────────────────────────

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Lazily configure web-push VAPID keys
function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT;
  if (pub && priv && sub) {
    webpush.setVapidDetails(sub, pub, priv);
  }
}

// ─── Email ────────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SMTP_HOST) return; // silently skip if unconfigured
  const transport = createTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "noreply@example.com",
    to,
    subject,
    html,
  });
}

// ─── SMS (Twilio) ─────────────────────────────────────────────────────────────

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return;

  const { default: twilio } = await import("twilio");
  const client = twilio(sid, token);
  await client.messages.create({ body, from, to });
}

// ─── Browser Push ─────────────────────────────────────────────────────────────

export async function sendPush({
  subscription,
  title,
  body,
}: {
  subscription: string; // JSON string
  title: string;
  body: string;
}) {
  try {
    initWebPush();
    const sub = JSON.parse(subscription) as webpush.PushSubscription;
    await webpush.sendNotification(sub, JSON.stringify({ title, body }));
  } catch {
    // Subscription may be expired; ignore push errors silently
  }
}

// ─── Unified Dispatch ─────────────────────────────────────────────────────────

export interface NotifyTarget {
  email: string;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  notifySms: boolean;
  phone?: string | null;
  pushSubscription?: string | null;
}

export async function notify(
  target: NotifyTarget,
  subject: string,
  html: string,
  smsText: string
) {
  const promises: Promise<void>[] = [];

  if (target.notifyEmail) {
    promises.push(sendEmail({ to: target.email, subject, html }));
  }
  if (target.notifySms && target.phone) {
    promises.push(sendSms({ to: target.phone, body: smsText }));
  }
  if (target.notifyBrowser && target.pushSubscription) {
    promises.push(
      sendPush({
        subscription: target.pushSubscription,
        title: subject,
        body: smsText,
      })
    );
  }

  await Promise.allSettled(promises);
}
