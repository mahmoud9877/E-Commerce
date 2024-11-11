import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import cloudinary from "cloudinary";

// Get the correct path
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../config/.env") });

// Use the variables from .env to configure Cloudinary
cloudinary.v2.config({
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  cloud_name: process.env.CLOUD_NAME,
  secure: true,
});

export default cloudinary;
