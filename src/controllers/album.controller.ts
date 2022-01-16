import multer from "multer";
import { validationResult } from "express-validator";
import { Request, Response } from "express";
import path from "path";
import { ObjectId } from "mongodb";

import Album, { IAlbum } from "../models/Album";
import Song, { ISong } from "../models/Song";
import { errorMessages, statusCodes } from "../utils/http-status";
import { ErrorResponse, SuccessResponse } from "../utils/response";
import { albumStatus } from "../enums/album-status";
import albumValidator from "../validators/album.validator";
import { randomString } from "../utils/utils";
import { GoogleCloudStorage } from "../services/google-cloud-storage/google-cloud-storage";

const cloudFilePath = (fingerprint: string, extension: string): string => {
  var cloudPath = "user-content/albums/" + fingerprint + "/art";
  const cloudFile = cloudPath + "/" + fingerprint + "." + extension;

  return cloudFile;
};

const albumController = {
  upload: multer({
    dest: "temp/",
    fileFilter: function (req: any, file: any, callback: any) {
      var ext = path.extname(file.originalname);
      if (ext !== ".jpg") {
        return req.res
          .status(statusCodes.clientInputError)
          .json(
            new ErrorResponse(errorMessages.clientInputError, {
              errorList: [
                {
                  msg: "Invalid value",
                  param: "coverArtFilename",
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
      fileSize: 3000 * 3000,
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

    let status = null;

    if (
      !req.query.status ||
      !Object.values(albumStatus).includes(req.query.status as string)
    ) {
      status = null;
    } else {
      status = req.query.status as string;
    }

    let albums: IAlbum[];
    const belongsTo = new ObjectId(res.locals.jwtPayload.user_id);

    if (status === null) {
      albums = await Album.find({ belongsTo }).sort({ createdAt: -1 }).exec();
    } else {
      albums = await Album.find({ $and: [{ belongsTo }, { status }] })
        .sort({ createdAt: -1 })
        .exec();
    }

    return res.status(statusCodes.success).json(new SuccessResponse(albums));
  },

  getOne: async (req: Request, res: Response) => {
    try {
      const belongsTo = new ObjectId(res.locals.jwtPayload.user_id);
      const albumId = new ObjectId(req.params.albumId);

      let album: any = await Album.findOne({
        $and: [{ belongsTo }, { _id: albumId }],
      }).exec();

      if (!album) {
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotExist));
      } else {
        // Strangely, if you don't stringify and parse this object, shit wont get extended.
        album = JSON.parse(JSON.stringify(album));

        const storage = new GoogleCloudStorage();

        if (album.artFileFormat === null) {
          album.artUrl = null;
        } else {
          album.artUrl = await storage.getSignedURL(
            cloudFilePath(album.fingerprint, album.artFileFormat)
          );
        }

        let songs: ISong[] = await Song.find({ albumId }).exec();
        songs = JSON.parse(JSON.stringify(songs)) || [];

        const signedUrlPromises = songs.map((song) => {
          if (!song.masterFileFormat)
            return new Promise<null>((resolve) => resolve(null));
          let cloudPath = "user-content/albums/" + album.fingerprint + "/songs";
          let cloudFile =
            cloudPath + "/" + song.fingerprint + song.masterFileFormat;
          return storage.getSignedURL(cloudFile);
        });

        const signedUrls: (string | null)[] = await Promise.all(
          signedUrlPromises
        );

        signedUrls.forEach((url, index) => {
          songs[index].masterUrl = url;
        });

        album.songs = songs;

        return res.status(statusCodes.success).json(new SuccessResponse(album));
      }
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  create: async (req: Request, res: Response) => {
    // validationResult function checks whether
    // any occurs or not and return an object
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
      const releasePartner = "Default";
      const belongsTo = res.locals.jwtPayload.user_id;
      const status = albumStatus.DRAFT;
      const fingerprint = "A" + randomString(12, "n");
      const artFileFormat = null;

      // If user already 3 albums with draft status, reject it.
      const existingDrafts = await Album.find({
        belongsTo,
        status: albumStatus.DRAFT,
      }).exec();

      if (existingDrafts.length >= 3)
        return res
          .status(statusCodes.conflict)
          .json(new ErrorResponse(errorMessages.conflict));

      const newAlbum = await new Album({
        fingerprint,
        belongsTo,
        releasePartner,
        status,
        artFileFormat,
      }).save();

      const response = {
        albumInfo: newAlbum,
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

  update: async (req: Request, res: Response) => {
    // validationResult function checks whether
    // any occurs or not and return an object
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
      const {
        title,
        primaryArtist,
        secondaryArtist,
        language,
        mainGenre,
        subGenre,
        releaseDate,
        productionYear,
        label,
        UPC,
      } = req.body;

      const belongsTo = res.locals.jwtPayload.user_id;

      // If user already has an album with draft status, reject it.
      const album = await Album.findOne({
        _id: new ObjectId(req.params.albumId),
        belongsTo,
        status: albumStatus.DRAFT,
      }).exec();

      if (!album)
        return res
          .status(statusCodes.unprocessableEntity)
          .json(new ErrorResponse(errorMessages.unprocessableEntity));

      const albumObject = {
        title,
        belongsTo,
        primaryArtist,
        secondaryArtist,
        language,
        mainGenre,
        subGenre,
        releaseDate,
        productionYear,
        label,
        UPC,
      };

      Object.keys(albumObject).forEach((key) => {
        // @ts-expect-error
        if (albumObject[key] === "__delete__") {
          if (!albumValidator.updateDeletable.includes(key)) {
            return res
              .status(statusCodes.clientInputError)
              .json(new ErrorResponse(errorMessages.deleteNondeletableField));
          }
          // @ts-expect-error
          albumObject[key] = null;
        }
      });

      Object.keys(albumObject).forEach((key) => {
        // @ts-expect-error
        if (albumObject[key] === undefined) {
          // @ts-expect-error
          delete albumObject[key];
        }
      });

      const updateResult = await Album.updateOne(
        { _id: req.params.albumId },
        { $set: { ...albumObject } }
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

  updateCoverArt: async (req: any, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    const { albumId } = req.params;
    const belongsTo = res.locals.jwtPayload.user_id;

    try {
      const album = await Album.findOne({
        $and: [{ belongsTo }, { _id: albumId }],
      }).exec();

      if (!album)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      const file = req.file;
      const filePath = file.path;
      const fileExtension = path.extname(file.originalname).substring(1);

      const storage = new GoogleCloudStorage();
      const cloudFile = cloudFilePath(album.fingerprint, fileExtension);

      const signedUrl = await storage.uploadFile(filePath, cloudFile);

      const updateResult = await Album.updateOne(
        { _id: req.params.albumId },
        { $set: { artFileFormat: fileExtension } }
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

  delete: async (req: Request, res: Response) => {
    const validationErrors = validationResult(req);

    if (!validationErrors.isEmpty()) {
      return res.status(statusCodes.clientInputError).json(
        new ErrorResponse(errorMessages.clientInputError, {
          errorList: validationErrors.array({ onlyFirstError: true }),
        })
      );
    }

    const { albumId } = req.params;
    const belongsTo = res.locals.jwtPayload.user_id;

    try {
      const album = await Album.findOne({
        $and: [{ belongsTo }, { _id: albumId }],
      }).exec();

      if (!album)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotBelongToUser));

      //Actually delete stuff from DB only if album is Draft.
      if (
        album.status === albumStatus.DRAFT ||
        album.status === albumStatus.REJECTED
      ) {
        const cloudPath = "user-content/albums/" + album.fingerprint;
        const storage = new GoogleCloudStorage();
        await storage.deleteFilesWithPrefix(cloudPath);

        const songDeleteResult = await Song.deleteMany({ albumId });

        if (songDeleteResult.ok !== 1) {
          return res
            .status(statusCodes.internalError)
            .json(new ErrorResponse(errorMessages.internalError));
        }

        const albumDeleteResult = await Album.deleteOne({ _id: albumId });

        if (albumDeleteResult.ok === 1) {
          return res.status(statusCodes.success).json(new SuccessResponse());
        }
      } else {
        const updateResult = await Album.updateOne(
          { _id: albumId },
          { $set: { deleted: true } }
        );

        if (updateResult.ok === 1) {
          return res.status(statusCodes.success).json(new SuccessResponse());
        }
      }
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  submit: async (req: Request, res: Response) => {
    const { albumId } = req.params;
    const belongsTo = res.locals.jwtPayload.user_id;

    try {
      const album = await Album.findOne({
        $and: [{ belongsTo }, { _id: albumId }],
      }).exec();

      if (!album)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.resourceDoesNotExist));

      // Album fields are always updated in all or none manner, so it is enough to check title.
      if (!album.title || album.title === null || album.title === "") {
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.incompleteSubmission));
      }

      const updateResult = await Album.updateOne(
        { _id: albumId },
        { $set: { status: albumStatus.SUBMITTED } }
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
};

export default albumController;
