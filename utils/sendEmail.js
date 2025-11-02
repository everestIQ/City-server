import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to, subject, message) {
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev", // ✅ Use sandbox sender
      to,
      subject,
      text: message,
    });

    console.log("✅ Email sent:", result);
    return result;
  } catch (error) {
    console.error("❌ Resend failed:", error);
    return { error };
  }
}
 export default sendEmail;