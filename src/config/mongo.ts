import dotenv from "dotenv";
import { ConnectionOptions } from "mongoose";
import configService from "../singleton/configuration-service-singleton";

dotenv.config({ path: ".env" });

const mongoOpts: ConnectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
};

const mongoConfig = {
  url: configService.get("mdbConnectionString"),
  configs: mongoOpts,
};

export default mongoConfig;
