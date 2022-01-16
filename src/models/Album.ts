import mongoose, { Schema, Document } from "mongoose";
import { ObjectId } from "mongodb";
import { albumStatus } from "../enums/album-status";
import { ISong } from "./Song";

export interface IAlbum extends Document {
  _id: ObjectId;
  fingerprint: string;
  title: string;
  UPC: string;
  belongsTo: ObjectId;
  primaryArtist: string;
  secondaryArtist?: string;
  language: string;
  mainGenre: string;
  subGenre: string;
  releaseDate: Date;
  releasePartner: string;
  status: string;
  deleted: boolean;
  songs?: ISong[] | null;
  artUrl: string;
  artFileFormat: string | null;
  productionYear: number;
  label: string;
}

const Album: Schema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
    },
    UPC: {
      type: String,
    },
    belongsTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    primaryArtist: {
      type: String,
    },
    secondaryArtist: {
      type: String,
    },
    language: {
      type: String,
    },
    mainGenre: {
      type: String,
    },
    subGenre: {
      type: String,
    },
    releaseDate: {
      type: Date,
    },
    releasePartner: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(albumStatus),
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    artFileFormat: {
      type: String,
      enum: [null, "jpg", "png"],
    },
    productionYear: {
      type: Number,
    },
    label: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAlbum>("Album", Album, "albums");
