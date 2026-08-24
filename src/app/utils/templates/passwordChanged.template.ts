export const getPasswordChangedTemplate = (name: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Changed Successfully</title>
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
      background: linear-gradient(135deg, #F26A1B 0%, #d35400 100%);
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
      color: #F26A1B;
    }
    .status-container {
      background: #fdf5f0;
      border: 1px dashed #F26A1B;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 30px 0;
    }
    .status-text {
      font-size: 20px;
      font-weight: 700;
      color: #F26A1B;
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
      <p>This is a confirmation that the password for your TutorKhujo account has been successfully changed.</p>
      <div class="status-container">
        <p class="status-text">Password Updated Successfully</p>
      </div>
      <p>If you did not make this change, please contact our support team immediately or reset your password using the "Forgot Password" option.</p>
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
