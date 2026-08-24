export const getAccountRoleUpdateEmailTemplate = (
  name: string,
  newRole: string
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Role Updated</title>
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
      background: #fcfdfe;
      border: 1px dashed #F26A1B;
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
      color: #F26A1B;
      margin: 0;
      text-transform: capitalize;
    }
    .button-container {
      text-align: center;
      margin: 30px 0 10px 0;
    }
    .btn {
      background-color: #F26A1B;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
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
      <p>We are writing to let you know that an administrator has updated your account role on TutorKhujo:</p>
      <div class="status-container">
        <p class="status-title">New Account Role</p>
        <p class="status-value">${newRole}</p>
      </div>
      <p>You can now access features and options associated with the <strong>${newRole}</strong> role. Please log out and log back in to ensure your session reflects these changes.</p>
      <div class="button-container">
        <a href="https://tutorkhujo.com/login" class="btn">Log In to Account</a>
      </div>
      <p>Best regards,<br><strong>The TutorKhujo Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2026 TutorKhujo. All rights reserved.</p>
      <p>If you did not request this or have questions, please contact our <a href="mailto:support@tutorkhujo.com">support team</a>.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const getAccountStatusUpdateEmailTemplate = (
  name: string,
  newStatus: string
): string => {
  const isBlocked = newStatus === "blocked";
  const title = isBlocked ? "Account Suspended ⚠️" : "Account Status Updated";
  const statusColor = isBlocked ? "#e74c3c" : "#2ecc71";
  const statusText = isBlocked ? "Suspended / Blocked" : "Active";

  const messageBody = isBlocked
    ? `<p>We regret to inform you that your TutorKhujo account has been suspended/blocked by our moderation team due to a violation of our platform guidelines.</p>
       <p>While suspended, you will not be able to log in, apply for tuition posts, or interact with other members of the platform.</p>
       <p>If you believe this decision was made in error or wish to appeal the suspension, please reply directly to this email or contact support.</p>`
    : `<p>We are pleased to inform you that your TutorKhujo account status has been updated to <strong>Active</strong>.</p>
       <p>Your access is fully restored. You can now log back in and continue using the platform normally.</p>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
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
      background: linear-gradient(135deg, ${statusColor} 0%, #2c3e50 100%);
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
      color: ${statusColor};
    }
    .status-container {
      background: #fcfdfe;
      border: 1px dashed ${statusColor};
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
      color: ${statusColor};
      margin: 0;
      text-transform: uppercase;
    }
    .button-container {
      text-align: center;
      margin: 30px 0 10px 0;
    }
    .btn {
      background-color: ${statusColor};
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-weight: 700;
      display: inline-block;
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
      color: ${statusColor};
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
      <p>We are writing to update you on your TutorKhujo account status:</p>
      <div class="status-container">
        <p class="status-title">Account Status</p>
        <p class="status-value">${statusText}</p>
      </div>
      ${messageBody}
      ${!isBlocked ? `
      <div class="button-container">
        <a href="https://tutorkhujo.com/login" class="btn">Log In to Account</a>
      </div>
      ` : ""}
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
