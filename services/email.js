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
      <p>Your account has been successfully created.</p>
      <p>Thank you for choosing First City Finance.</p>
      `
    ),
  });
}

export async function sendDepositAlert(user, amount) {
  return sendEmail({
    to: user.email,
    subject: "Deposit Alert",
    text: `Deposit of $${amount}`,
    html: emailLayout(
      "Deposit Successful",
      `
      <div style="background:#e8f5e9;padding:15px;border-radius:8px;color:#2e7d32;">
        Deposit Successfully Credited
      </div>

      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>$${Number(amount).toFixed(2)} has been credited.</p>
      `
    ),
  });
}

export async function sendTransferAlert(user, amount, beneficiary) {
  return sendEmail({
    to: user.email,
    subject: "Transfer Successful",
    text: "Transfer successful",
    html: emailLayout(
      "Transfer Successful",
      `
      <div style="background:#e3f2fd;padding:15px;border-radius:8px;color:#0d47a1;">
        Transfer Completed
      </div>

      <p>Hello <strong>${user.firstName}</strong>,</p>
      <p>$${Number(amount).toFixed(2)} sent to <strong>${beneficiary}</strong></p>
      `
    ),
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
      <p>A login was detected on your account.</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>

      <div style="background:#fff3cd;padding:15px;border-radius:8px;color:#856404;">
        If this was not you, contact support immediately.
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
      "Account Suspended",
      `
      <div style="background:#f8d7da;padding:15px;border-radius:8px;color:#842029;">
        Your account has been suspended.
      </div>

      <p><strong>Reason:</strong> ${reason || "Contact support"}</p>
      `
    ),
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
      <div style="background:#d1e7dd;padding:15px;border-radius:8px;color:#0f5132;">
        Your account has been restored.
      </div>

      <p>You can now use all banking services.</p>
      `
    ),
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

      <p>Reset your password using the button below:</p>

      <p>
        <a href="${resetLink}"
          style="background:#0d6efd;color:#fff;padding:12px 20px;
          text-decoration:none;border-radius:6px;display:inline-block;">
          Reset Password
        </a>
      </p>
      `
    ),
  });
}