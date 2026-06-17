import sendEmail from "./sendEmail.js";

export async function sendWelcomeEmail(user) {
  return sendEmail(
    user.email,
    "Welcome to First City Finance",
    `Hello ${user.firstName},

Your account has been successfully created.

Thank you for banking with First City Finance.

Regards,
First City Finance`
  );
}

export async function sendDepositAlert(user, amount) {
  return sendEmail(
    user.email,
    "Deposit Alert",
    `Dear ${user.firstName},

A deposit of $${amount} has been credited to your account.

Thank you for banking with us.`
  );
}

export async function sendTransferAlert(
  user,
  amount,
  beneficiary
) {
  return sendEmail(
    user.email,
    "Transfer Successful",
    `Dear ${user.firstName},

Your transfer of $${amount} to ${beneficiary} was successful.

Thank you for banking with us.`
  );
}

export async function sendLoginAlert(user) {
  return sendEmail(
    user.email,
    "Login Alert",
    `Dear ${user.firstName},

A login was detected on your First City Finance account.

Time: ${new Date().toLocaleString()}

If this was not you, please contact support immediately.

First City Finance Security Team`
  );
}

export async function sendSuspensionEmail(user, reason) {
  return sendEmail(
    user.email,
    "Account Suspended",
    `Dear ${user.firstName},

Your First City Finance account has been suspended.

Reason:
${reason || "Please contact customer support for more information."}

If you believe this is an error, please contact support immediately.

Regards,
First City Finance`
  );
}

export async function sendReactivationEmail(user) {
  return sendEmail(
    user.email,
    "Account Reactivated",
    `Dear ${user.firstName},

Your First City Finance account has been reactivated.

You may now log in and continue using all banking services.

Thank you for banking with us.

Regards,
First City Finance`
  );
}

export async function sendPasswordResetEmail(
  user,
  resetLink
) {
  return sendEmail(
    user.email,
    "Password Reset Request",
    `Dear ${user.firstName},

We received a request to reset your password.

Use the link below to create a new password:

${resetLink}

If you did not request this reset, please ignore this email.

Regards,
First City Finance`
  );
}