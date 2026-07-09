import sendEmail from "./sendEmail.js";
import { emailLayout } from "./emailTemplates.js";

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: "Welcome to First City Finance",
    text: `Welcome ${user.firstName}`,
    html: emailLayout(
  "Welcome to First City Finance",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <p>
    Welcome to First City Finance. Your account has been successfully
    created and is now ready for use.
  </p>

  <div style="
    background:#f8f9fa;
    padding:18px;
    border-radius:8px;
    margin:20px 0;
  ">
    <strong>Account Status:</strong> Active<br/>
    <strong>Customer Email:</strong> ${user.email}
  </div>

  <p>
    You can now securely access your account, monitor balances,
    review transactions, and manage your banking activities online.
  </p>

  <p>
    Thank you for choosing First City Finance.
  </p>
  `
)
  });
}

export async function sendCreditAlert(user, {
  amount,
  referenceId,
  balance,
  currency = "USD",
}) {
  return sendEmail({
    to: user.email,
    subject: "Credit Alert",
    text: `Credit of $${amount}`,
    html: emailLayout(
  "Credit Confirmation",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <p>
    A credit has been successfully added to your account.
  </p>

  <div style="
    background:#e8f5e9;
    padding:18px;
    border-radius:8px;
    color:#2e7d32;
    margin:20px 0;
  ">
    <strong>Amount Credited:</strong>
    $${Number(amount).toFixed(2)}
  </div>

  <p>
    The funds are now available for use.
  </p>

  <p>
    If you were not expecting this transaction,
    please contact support immediately.
  </p>
  `
)
  });
}

export async function sendTransferAlert(user, {
  amount,
  beneficiary,
  referenceId,
  balance,
  bankName,
  currency,
  transferType,
}) {
  return sendEmail({
    to: user.email,
    subject: "Transfer Successful",
    text: "Transfer successful",
    html: emailLayout(
  "Transfer Successful",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <p>
    Your transfer request has been successfully processed.
  </p>

  <div style="
    background:#e3f2fd;
    padding:18px;
    border-radius:8px;
    margin:20px 0;
  ">
    <strong>Amount:</strong>
    $${Number(amount).toFixed(2)}<br/>

    <strong>Beneficiary:</strong>
    ${beneficiary}
  </div>

  <p>
    Please retain this email for your records.
  </p>

  <p>
    If you did not authorize this transfer,
    contact our security team immediately.
  </p>
  `
)
  });
}

export async function sendLoginAlert(user) {
  const displayName =
    user.firstName || user.otherName || user.email || "Customer";

  return sendEmail({
    to: user.email,
    subject: "Login Alert",
    text: "Login detected",
    html: emailLayout(
  "Security Login Alert",
  `
  <p>Hello <strong>${displayName}</strong>,</p>

  <p>
    A successful login was detected on your account.
  </p>

  <div style="
    background:#fff3cd;
    padding:18px;
    border-radius:8px;
    color:#856404;
    margin:20px 0;
  ">
    <strong>Login Time:</strong>
    ${new Date().toLocaleString()}
  </div>

  <p>
    If this login was performed by you,
    no further action is required.
  </p>

  <p>
    If you do not recognize this activity,
    change your password immediately and contact support.
  </p>
  `
)
  });
}

export async function sendIncomingTransferAlert(user, data) {
  const {
    amount,
    senderName,
    referenceId,
    currency = "USD",
    bankName,
  } = data;

  return sendEmail({
    to: user.email,
    subject: "Incoming Transfer Received",
    text: `You received ${currency} ${amount}`,
    html: emailLayout(
      "Incoming Transfer Received",
      `
      <div style="background:#e8f5ff;padding:15px;border-radius:8px;color:#0d6efd;">
        Funds Received Successfully
      </div>

      <p>Hello <strong>${user.firstName}</strong>,</p>

      <p>You have received a transfer.</p>

      <p><strong>Amount:</strong> ${currency} ${Number(amount).toFixed(2)}</p>
      <p><strong>From:</strong> ${senderName || "External Transfer"}</p>
      <p><strong>Bank:</strong> ${bankName || "N/A"}</p>
      <p><strong>Reference:</strong> ${referenceId}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>

      <div style="margin-top:15px;font-size:12px;color:#666;">
        If you did not expect this transaction, contact support immediately.
      </div>
      `
    ),
  });
}


export async function sendSuspensionEmail(user, reason) {
  return sendEmail({
    to: user.email,
    subject: "Account Suspended",
    text: "Account suspended",
    html: emailLayout(
  "Account Suspension Notice",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <div style="
    background:#f8d7da;
    padding:18px;
    border-radius:8px;
    color:#842029;
    margin:20px 0;
  ">
    Your account has been temporarily suspended.
  </div>

  <p>
    <strong>Reason:</strong><br/>
    ${reason || "Please contact customer support."}
  </p>

  <p>
    During this period, certain banking services
    may be restricted.
  </p>

  <p>
    Please contact our support team if you require assistance.
  </p>
  `
)
  });
}

export async function sendReactivationEmail(user) {
  return sendEmail({
    to: user.email,
    subject: "Account Reactivated",
    text: "Account reactivated",
html: emailLayout(
  "Account Reactivated",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <div style="
    background:#d1e7dd;
    padding:18px;
    border-radius:8px;
    color:#0f5132;
    margin:20px 0;
  ">
    Your account has been successfully reactivated.
  </div>

  <p>
    All banking services have been restored
    and are available for use.
  </p>

  <p>
    Thank you for your patience and for banking with us.
  </p>
  `
)
  });
}

export async function sendPasswordResetEmail(user, resetLink) {
  return sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    text: "Password reset requested",
html: emailLayout(
  "Password Reset Request",
  `
  <p>Hello <strong>${user.firstName}</strong>,</p>

  <p>
    We received a request to reset your password.
  </p>

  <p>
    Click the button below to create a new password:
  </p>

  <p style="text-align:center;">
    <a href="${resetLink}"
      style="
        background:#0d6efd;
        color:white;
        padding:14px 24px;
        text-decoration:none;
        border-radius:6px;
        display:inline-block;
        font-weight:bold;
      ">
      Reset Password
    </a>
  </p>

  <p>
    This link will expire automatically for security reasons.
  </p>

  <p>
    If you did not request a password reset,
    you may safely ignore this email.
  </p>
  `
)
  });
}