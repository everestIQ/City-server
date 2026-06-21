import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * BANK-GRADE EMAIL SENDER
 * - Always sends HTML wrapper
 * - Automatically converts text → HTML fallback
 * - Prevents undefined email bodies
 */
export async function sendEmail({
  to,
  subject,
  text = "",
  html = "",
}) {
  try {
    if (!to) {
      throw new Error("Recipient email (to) is required");
    }

    const finalHtml =
      html ||
      `
      <div style="font-family:Arial;padding:20px;line-height:1.6">
        <h2>${subject}</h2>
        <p>${text}</p>
        <hr/>
        <small>This is an automated message from First City Finance.</small>
      </div>
      `;

    const result = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "First City Finance <noreply@firstcityfinance.com>",
      to,
      subject,
      text: text || subject,
      html: finalHtml,
    });

    console.log("✅ Email sent:", subject, "→", to);
    return result;
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    return { error };
  }
}

export default sendEmail;