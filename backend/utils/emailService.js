const nodemailer = require('nodemailer');

/**
 * Checks whether an external SMTP provider is configured via environment variables.
 * @returns {boolean}
 */
const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
};

/**
 * Retrieves the configured frontend base URL.
 * Priority: FRONTEND_URL -> CLIENT_URL -> http://localhost:5173
 * @returns {string}
 */
const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  return url.replace(/\/+$/, '');
};

/**
 * Creates a reusable Nodemailer transport using configured SMTP environment variables.
 * @returns {nodemailer.Transporter}
 */
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Useful timeouts to prevent hung socket connections
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

/**
 * Builds a clean, responsive HTML email template for workspace invitations using Boiler Plate branding.
 *
 * @param {Object} params
 * @param {string} params.organizationName
 * @param {string} params.inviterName
 * @param {string} params.role
 * @param {string} params.invitationUrl
 * @param {number} params.expiresDays
 * @returns {string}
 */
const buildInvitationHtml = ({
  organizationName,
  inviterName = 'A workspace administrator',
  role = 'MEMBER',
  invitationUrl,
  expiresDays = 7
}) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${escapeHtml(organizationName)} on Boiler Plate</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#0F172A;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC; padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E2E8F0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:32px 36px 24px 36px; text-align:left; border-bottom:1px solid #F1F5F9;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display:inline-block; background-color:#2563EB; color:#FFFFFF; font-weight:700; font-size:13px; letter-spacing:0.04em; text-transform:uppercase; padding:6px 14px; border-radius:6px;">
                      Boiler Plate
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:16px;">
                    <h1 style="margin:0; font-size:22px; font-weight:700; color:#0F172A; line-height:1.3;">
                      You're invited to join ${escapeHtml(organizationName)}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:28px 36px 32px 36px; text-align:left;">
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#334155;">
                Hello,
              </p>
              
              <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#334155;">
                <strong>${escapeHtml(inviterName)}</strong> has invited you to join the <strong>${escapeHtml(organizationName)}</strong> workspace on Boiler Plate as an <strong>${escapeHtml(role)}</strong>.
              </p>

              <p style="margin:0 0 28px 0; font-size:14.5px; line-height:1.6; color:#475569;">
                With Boiler Plate, your team can coordinate shared workspace resources, reserve meeting spaces and equipment, and collaborate in real-time.
              </p>

              <!-- Primary Action Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; background-color:#2563EB; color:#FFFFFF; font-size:15px; font-weight:600; text-decoration:none; padding:13px 32px; border-radius:8px; box-shadow:0 2px 4px rgba(37, 99, 235, 0.2); text-align:center;">
                      Accept Invitation &amp; Set Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:12px 16px; margin:24px 0 20px 0;">
                <p style="margin:0; font-size:13px; line-height:1.5; color:#64748B;">
                  ⏳ <strong>Notice:</strong> This single-use invitation link is valid for <strong>${expiresDays} days</strong>. After that, a new invitation will need to be issued.
                </p>
              </div>

              <!-- Fallback Plain-Text Link -->
              <div style="margin-top:24px; padding-top:20px; border-top:1px solid #F1F5F9;">
                <p style="margin:0 0 8px 0; font-size:12.5px; color:#64748B; line-height:1.5;">
                  Button not working? Copy and paste this fallback link into your browser:
                </p>
                <p style="margin:0; font-size:12px; line-height:1.5; word-break:break-all;">
                  <a href="${invitationUrl}" target="_blank" rel="noopener noreferrer" style="color:#2563EB; text-decoration:underline;">
                    ${invitationUrl}
                  </a>
                </p>
              </div>

              <!-- Security Note -->
              <div style="margin-top:24px; padding-top:16px; border-top:1px solid #F1F5F9;">
                <p style="margin:0; font-size:12px; line-height:1.5; color:#94A3B8;">
                  🔒 <strong>Security Note:</strong> If you were not expecting this invitation or do not recognize the sender, you can safely ignore this email. No account has been created yet.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px; background-color:#F8FAFC; border-top:1px solid #F1F5F9; text-align:center;">
              <p style="margin:0; font-size:12px; color:#94A3B8; line-height:1.5;">
                Boiler Plate · Modern Workspace &amp; Resource Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Builds plain-text fallback content for the invitation email.
 */
const buildInvitationText = ({
  organizationName,
  inviterName = 'A workspace administrator',
  role = 'MEMBER',
  invitationUrl,
  expiresDays = 7
}) => {
  return `You're invited to join ${organizationName} on Boiler Plate

Hello,

${inviterName} has invited you to join the ${organizationName} workspace on Boiler Plate as an ${role}.

To accept this invitation and set up your account password, click the link below:
${invitationUrl}

Notice:
This single-use invitation link is valid for ${expiresDays} days.

Security Note:
If you were not expecting this invitation or do not recognize the sender, you can safely ignore this email. No account has been created yet.

--
Boiler Plate · Modern Workspace & Resource Management
`;
};

/**
 * Escapes HTML characters to prevent XSS in email clients.
 */
const escapeHtml = (str = '') => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Sends a production-ready invitation email via configured SMTP.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.organizationName - Workspace name
 * @param {string} options.inviterName - Name of the admin who invited
 * @param {string} options.role - Permitted role (ADMIN or MEMBER)
 * @param {string} options.invitationUrl - One-time acceptance link containing token
 * @param {number} [options.expiresDays=7] - Number of days until token expiration
 * @returns {Promise<Object>} Delivery info from Nodemailer
 */
const sendInvitationEmail = async ({
  to,
  organizationName,
  inviterName,
  role = 'MEMBER',
  invitationUrl,
  expiresDays = 7
}) => {
  if (!isEmailConfigured()) {
    throw new Error('SMTP email provider is not configured. Missing required SMTP credentials.');
  }

  const transporter = createTransporter();
  const from = process.env.SMTP_FROM;
  const subject = `You're invited to join ${organizationName} on Boiler Plate`;

  const html = buildInvitationHtml({
    organizationName,
    inviterName,
    role,
    invitationUrl,
    expiresDays
  });

  const text = buildInvitationText({
    organizationName,
    inviterName,
    role,
    invitationUrl,
    expiresDays
  });

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html
  };

  // Dispatch email without logging raw token or secret credentials
  const info = await transporter.sendMail(mailOptions);
  return info;
};

module.exports = {
  isEmailConfigured,
  getFrontendUrl,
  buildInvitationHtml,
  buildInvitationText,
  sendInvitationEmail
};
