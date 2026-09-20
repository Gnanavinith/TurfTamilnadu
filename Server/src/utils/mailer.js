import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS)

const transport = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null

/**
 * Low-level send. Never throws: when SMTP is unconfigured or down the mail is
 * logged instead (so flows stay usable during development).
 */
async function sendMail({ to, subject, text, html }) {
  if (!transport) {
    logger.info({ to }, `[MAIL-stub] "${subject}" -> ${to}${text ? `\n${text}` : ''}`)
    return { delivered: false }
  }

  try {
    const from = `Turf <${env.SMTP_FROM || env.SMTP_USER}>`
    const info = await transport.sendMail({ from, to, subject, text, html })
    logger.info({ to, messageId: info.messageId }, subject)
    return { delivered: true }
  } catch (err) {
    logger.warn({ to, err: err.message }, `Failed to send "${subject}"`)
    return { delivered: false }
  }
}

export async function sendInviteEmail(
  to,
  { teamName, inviterName, inviterEmail, acceptUrl, loginUrl, credentials },
) {
  const by = inviterName || inviterEmail || 'A player'

  const credentialsText = credentials
    ? `Your account has been created. Log in with:
Email: ${credentials.email}
Password: ${credentials.password}
Log in here: ${loginUrl}`
    : 'You can also sign in with your existing Turf account.'
  const credentialsHtml = credentials
    ? `
        <p style="margin: 24px 0 8px; font-weight:600;">Your account has been created:</p>
        <div style="background:#f1f5f9;border-radius:10px;padding:14px 18px;font-family:monospace;line-height:1.7;">
          <div>Email: <strong>${credentials.email}</strong></div>
          <div>Password: <strong>${credentials.password}</strong></div>
        </div>
        <p style="color:#64748b;font-size:13px;">
          Sign in at <a href="${loginUrl}" style="color:#059669;">${loginUrl}</a> with these
          credentials, then accept the invite below.
        </p>`
    : `
        <p style="color:#64748b;font-size:13px;">
          Already have an account? Just sign in at
          <a href="${loginUrl}" style="color:#059669;">${loginUrl}</a> and open the link again.
        </p>`

  return sendMail({
    to,
    subject: `You're invited to join ${teamName} on Turf`,
    text: `${by} invited you to join ${teamName} on Turf. Accept the invite: ${acceptUrl}

${credentialsText}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">Turf</h2>
        <p>Hi,</p>
        <p><strong>${by}</strong> invited you to join the team <strong>${teamName}</strong>.</p>
        <p style="margin: 28px 0;">
          <a href="${acceptUrl}"
             style="background:#059669;color:#ffffff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">
            Accept invite
          </a>
        </p>
        ${credentialsHtml}
        <p style="color:#64748b;font-size:13px;">
          This link reveals your join details and is valid for 7 days.
        </p>
      </div>`,
  })
}

export default { sendInviteEmail }