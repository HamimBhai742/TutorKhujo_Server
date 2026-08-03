export const getVerificationOtpTemplate = (name: string, otpCode: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f7f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #eef2f1;
    }
    .header {
      background: linear-gradient(135deg, #0F5B47 0%, #093c2e 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #2c3e50;
      line-height: 1.6;
    }
    .content h2 {
      font-size: 20px;
      margin-top: 0;
      color: #0F5B47;
    }
    .otp-container {
      background: #f0f7f4;
      border: 1px dashed #0F5B47;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 800;
      color: #0F5B47;
      letter-spacing: 6px;
      margin: 0;
    }
    .footer {
      background: #fcfdfe;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #eef2f1;
      font-size: 13px;
      color: #7f8c8d;
    }
    .footer a {
      color: #F26A1B;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TutorKhujo</h1>
    </div>
    <div class="content">
      <h2>Hello ${name},</h2>
      <p>Thank you for choosing TutorKhujo—Bangladesh's premier learning network. We are excited to have you join us.</p>
      <p>Please use the following 6-digit One-Time Password (OTP) to verify your account. This code is valid for 10 minutes:</p>
      <div class="otp-container">
        <p class="otp-code">${otpCode}</p>
      </div>
      <p>If you did not initiate this registration request, you can safely ignore this email.</p>
      <p>Best regards,<br><strong>The TutorKhujo Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2026 TutorKhujo. All rights reserved.</p>
      <p>If you have any questions, please contact our <a href="mailto:support@tutorkhujo.com">support team</a>.</p>
    </div>
  </div>
</body>
</html>
  `;
};
