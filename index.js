import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
//set directory dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "./config/.env") });
import express from "express";
import chalk from "chalk";
import initApp from "./src/index.router.js";
const app = express();
// setup port and the baseUrl
const port = process.env.PORT || 5000;

initApp(app, express);
const warn = chalk.hex("#09c");
app.listen(port, () =>
  console.log(
    warn(`Example app listening on port... ` + chalk.green.bold(`${port}!`))
  )
);
