const ICONS = {
  facebook: "https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png",
  instagram: "https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png",
  twitter: "https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png",
};

const SOCIAL_LINKS = [
  { name: "Facebook", href: () => process.env.facebookLink, icon: ICONS.facebook },
  { name: "Instagram", href: () => process.env.instegram, icon: ICONS.instagram },
  { name: "Twitter", href: () => process.env.twitterLink, icon: ICONS.twitter },
];

export class EmailTemplates {
  // Shared "follow us" icon row; each template supplies its own markup per link
  static #socialLinks(render: (link: { name: string; href?: string; icon: string }) => string): string {
    return SOCIAL_LINKS.map(({ name, href, icon }) => render({ name, href: href(), icon })).join("");
  }

  static confirmEmail({ link, rfLink }: { link: string; rfLink: string }): string {
    return `<!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
  </head>
  <style type="text/css">
  body {background-color: #88BDBF; margin: 0px;}
  </style>
  <body style="margin:0px;">
  <table border="0" width="50%" style="margin:auto;padding:30px;background-color: #F3F3F3;border:1px solid #630E2B;">
    <tr>
      <td>
        <table border="0" width="100%">
          <tr>
            <td>
              <h1>
                  <img width="100px" src="https://res.cloudinary.com/ddajommsw/image/upload/v1670702280/Group_35052_icaysu.png"/>
              </h1>
            </td>
            <td>
              <p style="text-align: right;">
                <a href="http://localhost:4200/#/" target="_blank" style="text-decoration: none;">View In Website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table border="0" cellpadding="0" cellspacing="0" style="text-align:center;width:100%;background-color: #fff;">
          <tr>
            <td style="background-color:#630E2B;height:100px;font-size:50px;color:#fff;">
              <img width="50px" height="50px" src="${process.env.logo}">
            </td>
          </tr>
          <tr>
            <td>
              <h1 style="padding-top:25px; color:#630E2B">Email Confirmation</h1>
            </td>
          </tr>
          <tr>
            <td>
              <p style="padding:0px 100px;"></p>
            </td>
          </tr>
          <tr>
            <td>
              <a href="${link}" style="margin:10px 0px 30px 0px;border-radius:4px;padding:10px 20px;border: 0;color:#fff;background-color:#630E2B;">Verify Email address</a>
            </td>
          </tr>
          <tr>
            <td>
              <br><br><br><br><br><br><br><br>
              <a href="${rfLink}" style="margin:10px 0px 30px 0px;border-radius:4px;padding:10px 20px;border: 0;color:#fff;background-color:#630E2B;">Request new email</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table border="0" width="100%" style="border-radius: 5px;text-align: center;">
          <tr>
            <td>
              <h3 style="margin-top:10px; color:#000">Stay in touch</h3>
            </td>
          </tr>
          <tr>
            <td>
              <div style="margin-top:20px;">
                ${EmailTemplates.#socialLinks(({ href, icon }) => `
                <a href="${href}" style="text-decoration: none;">
                  <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                    <img src="${icon}" width="50px" height="50px">
                  </span>
                </a>`)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </body>
  </html>`;
  }

  static resetPasswordCode({ code }: { code: number | null }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Code</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
        Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #f4f4f4;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #630E2B;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header img {
      max-height: 50px;
    }
    .content {
      padding: 30px;
      text-align: center;
    }
    .content h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #630E2B;
    }
    .content p {
      font-size: 16px;
      color: #555;
    }
    .code-box {
      margin: 30px auto;
      display: inline-block;
      background: #f3f3f3;
      padding: 15px 25px;
      font-size: 24px;
      letter-spacing: 5px;
      border-radius: 6px;
      font-weight: bold;
      color: #630E2B;
      border: 1px solid #ccc;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 14px;
      color: #888;
    }
    .social-icons a {
      margin: 0 10px;
      display: inline-block;
    }
    .social-icons img {
      width: 32px;
      height: 32px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.logo}" alt="Company Logo">
    </div>
    <div class="content">
      <h1>Reset Your Password</h1>
      <p>Use the code below to reset your password. If you didn’t request a password reset, you can safely ignore this email.</p>
      <div class="code-box">${code}</div>
      <p>This code will expire soon, so be sure to use it right away.</p>
    </div>
    <div class="footer">
      <p>Follow us on:</p>
      <div class="social-icons">
        ${EmailTemplates.#socialLinks(({ name, href, icon }) => `
        <a href="${href}">
          <img src="${icon}" alt="${name}">
        </a>`)}
      </div>
      <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
  }
}
