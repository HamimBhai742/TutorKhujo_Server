export const getTutorVerificationEmailTemplate = (
  name: string,
  status: "Approved" | "Rejected"
): string => {
  const isApproved = status === "Approved";
  const title = isApproved ? "Tutor Profile Verified! ✅" : "Tutor Verification Status Update";
  const statusColor = isApproved ? "#2ecc71" : "#e74c3c";
  const statusText = isApproved ? "Approved" : "Not Approved";

  const messageBody = isApproved
    ? `<p>Congratulations! Your tutor profile has been verified by our team. You are now a verified tutor on our platform.</p>
       <p>You can now start applying for tuition posts, contact students, and build your profile to attract more clients.</p>`
    : `<p>We reviewed your tutor onboarding documents, but unfortunately, we were unable to approve your profile verification at this time.</p>
       <p>Please log in to your account, review the guidelines, and re-submit valid certificates, NID, or student ID card files. If you believe this is a mistake, feel free to contact our support team.</p>`;

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
      <p>We have updated the verification status of your TutorKhujo account profile:</p>
      <div class="status-container">
        <p class="status-title">Verification Status</p>
        <p class="status-value">${statusText}</p>
      </div>
      ${messageBody}
      <div class="button-container">
        <a href="${isApproved ? 'https://tutorkhujo.com/dashboard' : 'https://tutorkhujo.com/tutor-onboarding'}" class="btn">
          ${isApproved ? 'Go to Dashboard' : 'Resolve Onboarding'}
        </a>
      </div>
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
