import mongoose, { Schema, Document } from "mongoose";
import { ObjectId } from "mongodb";
import { roles } from "../enums/role-access";

export interface IUser extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  password?: string;
  role: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeUrl?: string;
  emailVerified: boolean;
}

const User: Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(roles),
      required: true,
    },
    spotifyUrl: {
      type: String,
      required: false,
    },
    appleMusicUrl: {
      type: String,
      required: false,
    },
    youtubeUrl: {
      type: String,
      required: false,
    },
    emailVerified: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", User, "users");
