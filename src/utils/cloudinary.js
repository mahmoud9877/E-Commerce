import * as dotenv from "dotenv";
dotenv.config();
import cloudinary from "cloudinary";

cloudinary.v2.config({
  api_key: 666485453323836,
  api_secret: "q2p2KwELWmlwOXERZqmVC4Jt9TU",
  cloud_name: "ecommerce1911",
  // api_key: process.env.API_KEY,
  // api_secret: process.env.API_SECRET,
  // cloud_name: process.env.CLOUD_NAME,
  secure: true,
});

export default cloudinary;
