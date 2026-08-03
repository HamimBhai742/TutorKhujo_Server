import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, html: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "TutorKhujo <noreply@tutorkhujo.com>";

  // If credentials are not provided, fallback to standard console logger for development
  if (!smtpUser || !smtpPass || !smtpHost) {
    console.log("\n" + "=".repeat(60));
    console.log(`✉️  [MOCK EMAIL WORKER] SENDING EMAIL TO: ${to}`);
    console.log(`   SUBJECT: ${subject}`);
    console.log("-".repeat(60));
    
    // Extract OTP value safely for visual developer feedback in console
    const otpMatch = html.match(/class="otp-code"[^>]*>([^<]+)/);
    if (otpMatch) {
      console.log(`\x1b[1m\x1b[36m   [ OTP CODE FOUND: ${otpMatch[1]} ]\x1b[0m`);
    } else {
      const otpMatchAlt = html.match(/\[\s*(\d{6})\s*\]/);
      if (otpMatchAlt) {
        console.log(`\x1b[1m\x1b[33m   [ RESET OTP CODE FOUND: ${otpMatchAlt[1]} ]\x1b[0m`);
      }
    }
    
    // Strip HTML tags for clean console display
    const textOnly = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`   BODY SNAPSHOT: ${textOnly.substring(0, 150)}...`);
    console.log("=".repeat(60) + "\n");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });
    console.log(`✉️  Email sent successfully: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error; // throw error so BullMQ worker knows the job failed and can retry it!
  }
};
