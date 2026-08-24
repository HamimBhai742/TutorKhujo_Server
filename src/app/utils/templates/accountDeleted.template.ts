export const getAccountDeletedEmailTemplate = (
  name: string
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Deactivated / Deleted</title>
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
      background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
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
      color: #e74c3c;
    }
    .status-container {
      background: #fcfdfe;
      border: 1px dashed #e74c3c;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .status-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #7f8c8d;
      margin: 0 0 5px 0;
    }
    .status-value {
      font-size: 24px;
      font-weight: 800;
      color: #e74c3c;
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
      color: #e74c3c;
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
      <p>We are writing to confirm that your TutorKhujo account has been successfully deactivated and marked for deletion:</p>
      <div class="status-container">
        <p class="status-title">Account Status</p>
        <p class="status-value">DEACTIVATED / DELETED</p>
      </div>
      <p>We are sorry to see you go! All your active matching logs and profile lists have been deactivated. If you did not request this deletion or if you would like to restore your account, please reach out to our support team as soon as possible.</p>
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
