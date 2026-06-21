export function emailLayout( title = "Notification", content = "" ) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;background:#eef2f7;font-family:Arial">

    <div style="max-width:650px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08)">

      <!-- HEADER -->
      <div style="background:#0d6efd;color:#fff;padding:22px;text-align:center;font-size:20px;font-weight:bold">
        First City Finance
      </div>

      <!-- BODY -->
      <div style="padding:30px">
        <h2 style="margin-top:0;color:#222">${title}</h2>
        ${content}
      </div>

      <!-- FOOTER -->
      <div style="background:#f4f4f4;padding:15px;text-align:center;font-size:12px;color:#666">
        © ${new Date().getFullYear()} First City Finance • Secure Banking System
      </div>

    </div>

  </body>
  </html>
  `;
}