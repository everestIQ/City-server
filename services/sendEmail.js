import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

console.log(
  "RESEND_API_KEY loaded:",
  !!process.env.RESEND_API_KEY
);

export async function sendEmail(
  to,
  subject,
  message,
  html = null
) {
  try {
    const result = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "First City Finance <noreply@firstcityfinance.com>",
      to,
      subject,
      text: message,
      ...(html && { html }),
    });

    console.log("FROM ADDRESS:", process.env.EMAIL_FROM);

    console.log("✅ Email sent:", result);
    return result;
  } catch (error) {
    console.error("❌ Resend failed:", error);
    return { error };
  }
}

export default sendEmail;