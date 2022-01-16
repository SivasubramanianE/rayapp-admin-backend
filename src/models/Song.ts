import mongoose, { Schema, Document } from "mongoose";
import { ObjectId } from "mongodb";

export interface ISong extends Document {
  _id: ObjectId;
  fingerprint: string;
  albumId: ObjectId;
  title: string;
  explicit: boolean;
  ISRC: string;
  primaryArtist: string;
  secondaryArtist?: string;
  composer: string;
  lyricist: string;
  language: string;
  mainGenre: string;
  subGenre: string;
  masterUrl: string | null;
  masterFileFormat: string;
}

const Song: Schema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      unique: true,
      required: true,
    },
    albumId: {
      type: Schema.Types.ObjectId,
      ref: "Album",
    },
    title: {
      type: String,
    },
    explicit: {
      type: Boolean,
      required: true,
      default: false,
    },
    ISRC: {
      type: String,
    },
    primaryArtist: {
      type: String,
    },
    secondaryArtist: {
      type: String,
    },
    composer: {
      type: String,
    },
    lyricist: {
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
    masterFileFormat: {
      type: String,
      enum: [null, "mp3", "wav", "flac"],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISong>("Song", Song, "songs");
