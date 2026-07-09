// services/emailEvents.js

export const EMAIL_EVENTS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  CREDIT_SUCCESS: "CREDIT_SUCCESS",
  TRANSFER_SUCCESS: "TRANSFER_SUCCESS",
  PASSWORD_RESET: "PASSWORD_RESET",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
};

export async function sendEmailEvent(eventType, data) {
  switch (eventType) {
    case EMAIL_EVENTS.LOGIN_SUCCESS:
      return sendLoginAlert(data.user);

    case EMAIL_EVENTS.CREDIT_SUCCESS:
      return sendCreditAlert(data.user, data.amount);

    case EMAIL_EVENTS.TRANSFER_SUCCESS:
      return sendTransferAlert(
        data.user,
        data.amount,
        data.beneficiary
      );

    default:
      console.log("Unknown email event");
  }
}