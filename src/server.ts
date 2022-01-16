// Dotenv
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

// Express
import express from "express";

// Mongoose
import mongoose from "mongoose";
import mongoConfig from "./config/mongo";
mongoose.connect(mongoConfig.url, mongoConfig.configs);

// Mids
import cors from "cors";
import morgan from "morgan";

// Routes
import routes from "./routes/routes";

// Express
const app = express();

// Mids

// for parsing application/json
app.use(express.json());

// for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

app.use(cors());
app.use(morgan("dev"));
app.use(routes);

app.listen(process.env.HTTP_PORT || 3333, () => {
  console.log(
    `RayApp Release server listening on ${process.env.HTTP_PORT || 3333}`
  );
});

export const appRoot = __dirname;
