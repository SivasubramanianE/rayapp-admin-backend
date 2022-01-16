import multer from "multer";
import { validationResult } from "express-validator";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";

import Album, { IAlbum } from "../models/Album";
import Song, { ISong } from "../models/Song";
import { appRoot } from "../server";
import { errorMessages, statusCodes } from "../utils/http-status";
import { ErrorResponse, SuccessResponse } from "../utils/response";
import songValidator from "../validators/song.validator";
import { randomString as generateId } from "../utils/utils";
import { GoogleCloudStorage } from "../services/google-cloud-storage/google-cloud-storage";

const makeCloudPathForSong = function (
  album: IAlbum,
  song: ISong,
  fileName?: string
) {
  let cloudPath = "user-content/albums/" + album.fingerprint + "/songs";
  let cloudFile = cloudPath + "/" + song.fingerprint;

  if (fileName) {
    cloudFile += path.extname(fileName);
  }

  return cloudFile;
};

const songController = {
  upload: multer({
    dest: "temp/",
    fileFilter: function (req: any, file: any, callback: any) {
      var ext = path.extname(file.originalname);
      if (ext !== ".mp3" && ext !== ".wav") {
        return req.res
          .status(statusCodes.clientInputError)
          .json(
            new ErrorResponse(errorMessages.clientInputError, {
              errorList: [
                {
                  msg: "Invalid value",
                  param: "masterFileName",
                  location: "body",
                },
              ],
            })
          )
          .end();
      }
      callback(null, true);
    },
    limits: {
      fileSize: 104857600, // 100 Mb
    },
  }),

  get: async (req: Request, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    const albumId = new ObjectId(req.query.albumId as string);
    const albumBelongsTo = new ObjectId(res.locals.jwtPayload.user_id);

    const album = await Album.findOne({
      $and: [{ _id: albumId }, { belongsTo: albumBelongsTo }],
    }).exec();

    if (!album) {
      return res
        .status(statusCodes.unprocessableEntity)
        .json(new ErrorResponse(errorMessages.unprocessableEntity));
    }

    const songs: ISong[] = await Song.find({ albumId }).exec();

    return res.status(statusCodes.success).json(new SuccessResponse(songs));
  },

  getOne: async (req: Request, res: Response) => {
    try {
      const belongsTo = new ObjectId(res.locals.jwtPayload.user_id);

      const song: ISong | null = await Song.findOne({
        $and: [{ belongsTo }, { _id: new ObjectId(req.params.songId) }],
      }).exec();

      if (!song)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.unprocessableEntity));

      const album: IAlbum | null = await Album.findOne({
        $and: [{ _id: song.albumId }],
      }).exec();

      if (!album)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.unprocessableEntity));

      if (!album.belongsTo.equals(res.locals.jwtPayload.user_id))
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      return res.status(statusCodes.success).json(new SuccessResponse(song));
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  create: async (req: Request, res: Response) => {
    // validationResult function checks whether
    // any error occurs or not and return an object
    const validationErrors = validationResult(req);

    // If some error occurs, then this
    // block of code will run
    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    try {
      const { albumId } = req.body;
      const fingerprint = "S" + generateId(12, "n");

      const album = await Album.findOne({ _id: albumId }).exec();

      if (!album)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      if (!album.belongsTo.equals(res.locals.jwtPayload.user_id))
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const newSong = await new Song({
        albumId,
        fingerprint,
      }).save();

      const response = {
        songInfo: newSong,
      };

      return res
        .status(statusCodes.created)
        .json(new SuccessResponse(response));
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  updateMasterFile: async (req: any, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    const { songId } = req.params;
    const belongsTo = res.locals.jwtPayload.user_id;

    try {
      const song = await Song.findOne({ _id: songId }).exec();

      if (!song)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotExist));

      const album = await Album.findOne({
        $and: [{ belongsTo }, { _id: song.albumId }],
      }).exec();

      if (!album)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotExist));

      const file = req.file;
      const filePath = file.path;

      const cloudFile = makeCloudPathForSong(album, song, file.originalname);
      const storage = new GoogleCloudStorage();

      const signedUrl = await storage.uploadFile(filePath, cloudFile);

      const updateResult = await Song.updateOne(
        { _id: songId },
        { $set: { masterFileFormat: path.extname(file.originalname) } }
      );

      if (updateResult.ok !== 1) {
        return res
          .status(statusCodes.internalError)
          .json(new ErrorResponse(errorMessages.internalError));
      }

      return res
        .status(statusCodes.success)
        .json(new SuccessResponse({ signedUrl }));
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  update: async (req: Request, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    try {
      const {
        title,
        primaryArtist,
        secondaryArtist,
        composer,
        lyricist,
        explicit,
        language,
        mainGenre,
        subGenre,
        ISRC,
      } = req.body;

      const { songId } = req.params;

      const song = await Song.findOne({ _id: songId }).exec();

      if (!song)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const album = await Album.findOne({ _id: song.albumId }).exec();

      if (!album)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.unprocessableEntity));

      if (!album.belongsTo.equals(res.locals.jwtPayload.user_id))
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const songObject = {
        title,
        primaryArtist,
        secondaryArtist,
        composer,
        lyricist,
        explicit,
        language,
        mainGenre,
        subGenre,
        ISRC,
      };

      Object.keys(songObject).forEach((key) => {
        // @ts-expect-error
        if (songObject[key] === "__delete__") {
          if (!songValidator.updateDeletable.includes(key)) {
            return res
              .status(statusCodes.clientInputError)
              .json(new ErrorResponse(errorMessages.deleteNondeletableField));
          }
          // @ts-expect-error
          songObject[key] = null;
        }
      });

      Object.keys(songObject).forEach((key) =>
        // @ts-expect-error
        songObject[key] === undefined ? delete songObject[key] : {}
      );

      const updateResult = await Song.updateOne(
        { _id: songId },
        { $set: { ...songObject } }
      );

      if (updateResult.ok === 1) {
        return res.status(statusCodes.success).json(new SuccessResponse());
      }
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  delete: async (req: Request, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    const { songId } = req.params;

    try {
      const song = await Song.findOne({ _id: songId }).exec();

      if (!song)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const album = await Album.findOne({ _id: song.albumId }).exec();

      if (!album)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.unprocessableEntity));

      if (!album.belongsTo.equals(res.locals.jwtPayload.user_id))
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const cloudFilePrefix = makeCloudPathForSong(album, song);

      const storage = new GoogleCloudStorage();
      await storage.deleteFilesWithPrefix(cloudFilePrefix);

      const deleteResult = await Song.deleteOne({ _id: songId });

      if (deleteResult.ok === 1) {
        return res.status(statusCodes.success).json(new SuccessResponse());
      }
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },
};

export default songController;
