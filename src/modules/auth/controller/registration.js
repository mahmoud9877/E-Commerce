import userModel from "../../../../DB/model/User.model.js";
import { asyncHandler } from "../../../utils/errorHandling.js";
import {
  generateToken,
  verifyToken,
} from "../../../utils/GenerateAndVerifyToken.js";
import { hash, compare } from "../../../utils/HashAndCompare.js";
import { customAlphabet } from "nanoid";
import sendEmail from "../../../utils/email.js";

export const getUser = asyncHandler(async (req, res, next) => {
  const userList = await userModel.find({ isDeleted: false });
  return res.json({ message: "Done", userList });
});

export const signup = asyncHandler(async (req, res, next) => {
  const { userName, email, password } = req.body;
  if (await userModel.findOne({ email: email.toLowerCase() })) {
    return next(new Error("Email Exist", { cause: 409 }));
  }
  const token = generateToken({
    payload: { email },
    signature: process.env.EMAIL_TOKEN,
    expiresIn: 60 * 5,
  });
  const refreshToken = generateToken({
    payload: { email },
    signature: process.env.EMAIL_TOKEN,
    expiresIn: 60 * 60 * 24 * 30,
  });

  const link = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${token}`;
  const rfLink = `${req.protocol}://${req.headers.host}/auth/NewConfirmEmail/${refreshToken}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"></head>
  <style type="text/css">
  body{background-color: #88BDBF;margin: 0px;}
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
  <p style="text-align: right;"><a href="http://localhost:4200/#/" target="_blank" style="text-decoration: none;">View In Website</a></p>
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
  <p style="padding:0px 100px;">
  </p>
  </td>
  </tr>
  <tr>
  <td>
  <a href="${link}" style="margin:10px 0px 30px 0px;border-radius:4px;padding:10px 20px;border: 0;color:#fff;background-color:#630E2B;">Verify Email address</a>
  </td>
  </tr>
  <tr>
  <td>
  <br>
  <br>
  <br>
  <br>
  <br>
  <br>
  <br>
  <br>
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
  <a  style="text-decoration: none;">
      <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" width="50px" height="50px">
      </span>
  </a>
  <a" style="text-decoration: none;">
      <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" width="50px" height="50px">
      </span>
  </a>
  <a  style="text-decoration: none;">
      <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
          <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" width="50px" height="50px">
      </span>
  </a>
  </div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </body>
  </html>`;

  if (!(await sendEmail({ to: email, subject: "Confirmation-Email", html }))) {
    return res.status(400).json({ message: "Email Rejected" });
  }
  const hashPassword = hash({ plaintext: password });
  const { _id } = await userModel.create({
    userName,
    email,
    password: hashPassword,
  });
  return res.status(201).json({ message: "Done", _id });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Email Not found", { cause: 404 }));
  }

  if (!user.confirmEmail) {
    return next(new Error("Confirm Your Email", { cause: 404 }));
  }
  if (!compare({ plaintext: password, hashValue: user.password })) {
    return next(new Error("In-Valid Login", { cause: 404 }));
  }

  const access_token = generateToken({
    payload: { id: user._id, userName: user.userName },
    expiresIn: 30 * 60,
  });

  const refresh_token = generateToken({
    payload: { id: user._id, userName: user.userName },
    expiresIn: 30 * 60 * 24 * 365,
  });
  user.status = "online";
  user.save();
  return res.status(201).json({ message: "Done", access_token, refresh_token });
});

export const sendCode = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const forgetCode = customAlphabet("123456789", 4);
  const user = await userModel.findOneAndUpdate(
    { email: email.toLowerCase() },
    { code: forgetCode() },
    { new: true }
  );
  if (!user) {
    return next(new Error("Not Register"), { cause: 404 });
  }

  const html = `<!DOCTYPE html>
  <html>
  <head>
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
  </head>
  <style type="text/css">
  body { background-color: #88BDBF; margin: 0px; }
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
  <p style="text-align: right;"><a href="http://localhost:4200/#/" target="_blank" style="text-decoration: none;">View In Website</a></p>
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
  <h1 style="padding-top:25px; color:#630E2B">Reset Password</h1>
  </td>
  </tr>
  <tr>
  <td>
  <p style="padding:0px 100px;">
  To verify your email address, please click the button below to receive your code.
  </p>
  </td>
  </tr>
  <tr>
  <td>
  <p style="margin:10px 0px 30px 0px;border-radius:4px;padding:10px 20px;border: 0;color:#fff;background-color:#630E2B;">
 ${user.code}</p>
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
  
  <a href="${process.env.facebookLink}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
  <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" width="50px" hight="50px"></span></a>
  
  <a href="${process.env.instegram}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
  <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" width="50px" hight="50px"></span>
  </a>
  
  <a href="${process.env.twitterLink}" style="text-decoration: none;"><span class="twit" style="padding:10px 9px;;color:#fff;border-radius:50%;">
  <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" width="50px" hight="50px"></span>
  </a>
  
  </div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </body>
  </html>`;
  if (!(await sendEmail({ to: email, subject: "Forget Password", html }))) {
    return res.json(400).json({ message: "Email Rejected" });
  }
  return res.status(200).json({ message: "Done" });
});

export const confirmEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { email } = verifyToken({ token, signature: process.env.EMAIL_TOKEN });
  if (!email) {
    return next(new Error("In-Valid Token Payload", { cause: 404 }));
  }
  const user = await userModel.updateOne(
    { email: email.toLowerCase() },
    { confirmEmail: true }
  );
  if (!user.matchedCount) {
    return res.status(404).send(`<p>Not Register Account </P>`);
  } else {
    return res.status(200).redirect(process.env.FE_URL);
  }
});

export const requestNewConfirmEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  let email;
  try {
    const decoded = verifyToken({ token, signature: process.env.EMAIL_TOKEN });
    email = decoded.email;
  } catch (error) {
    return next(new Error("Invalid Token Payload", { cause: 404 }));
  }

  if (!email) {
    return next(new Error("Invalid Token Payload", { cause: 404 }));
  }

  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(404).redirect(`${process.env.FE_URL}/#/invalidEmail`);
  }

  if (user.confirmEmail) {
    return res.status(404).redirect(`${process.env.FE_URL}`);
  }

  const newToken = generateToken({
    payload: { email: email.toLowerCase() },
    signature: process.env.EMAIL_TOKEN,
    expiresIn: 60 * 2,
  });

  const link = `${req.protocol}://${req.headers.host}/auth/confirmEmail/${newToken}`;
  const rfLink = `${req.protocol}://${req.headers.host}/auth/NewConfirmEmail/${token}`;

  const html = `<!DOCTYPE html>
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
                <a href="${process.env.facebookLink}" style="text-decoration: none;">
                  <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                    <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" width="50px" height="50px">
                  </span>
                </a>
                <a href="${process.env.instegram}" style="text-decoration: none;">
                  <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                    <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" width="50px" height="50px">
                  </span>
                </a>
                <a href="${process.env.twitterLink}" style="text-decoration: none;">
                  <span class="twit" style="padding:10px 9px;color:#fff;border-radius:50%;">
                    <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" width="50px" height="50px">
                  </span>
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  </body>
  </html>`;

  const emailSent = await sendEmail({
    to: email,
    subject: "Confirmation Email",
    html,
  });
  if (!emailSent) {
    return res.status(400).json({ message: "Email Rejected" });
  }

  return res.status(201).send("<p>New Confirmation email sent</p>");
});

export const forgetPassword = asyncHandler(async (req, res, next) => {
  const { email, code, password, cPassword } = req.body;
  const user = await userModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return next(new Error("Not Registered Account", { cause: 404 }));
  }
  if (user.code != code) {
    return next(new Error("Incorrect code", { cause: 400 }));
  }
  if (password !== cPassword) {
    return next(new Error("Passwords do not match", { cause: 400 }));
  }
  user.password = hash({ plaintext: password });
  user.code = null;
  await user.save();
  return res.status(200).json({ message: "Password updated successfully" });
});
