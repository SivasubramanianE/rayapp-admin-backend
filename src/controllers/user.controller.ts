import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import User, { IUser } from "../models/User";
import bcrypt from "bcrypt";
import bcryptConfig from "../config/bcrypt";
import { ErrorResponse, SuccessResponse } from "../utils/response";
import configService from "../singleton/configuration-service-singleton";
import { statusCodes, errorMessages } from "../utils/http-status";
import { roles } from "../enums/role-access";

function makeToken(user: IUser) {
  return jwt.sign(
    {
      user_id: user._id,
      name: user.name,
      email: user.email,
    },
    configService.get("jwtKey"),
    {
      expiresIn: configService.get("jwtExpiry"),
    }
  );
}

const userController = {
  create: async (req: Request, res: Response) => {
    try {
      const { name, email, password: passwordBody } = req.body;

      if (!name || !email || !passwordBody)
        return res
          .status(statusCodes.clientInputError)
          .json(new ErrorResponse(errorMessages.clientInputError));

      const isUserExists = await User.findOne({ email }).exec();

      if (isUserExists)
        return res
          .status(statusCodes.conflict)
          .json(new ErrorResponse(errorMessages.conflict));

      const password = await bcrypt.hash(passwordBody, bcryptConfig.salt);
      const role = roles.ARTIST;
      const emailVerified = false;

      const newUser = await new User({
        name,
        email,
        password,
        role,
        emailVerified,
      }).save();

      const response = {
        accessToken: makeToken(newUser),
        userInfo: newUser,
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

  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res
          .status(statusCodes.unauthorized)
          .json(new ErrorResponse(errorMessages.unauthorized));

      const noSelect = ["-__v"];
      const user = await User.findOne({ email }, noSelect).exec();

      if (!user)
        return res
          .status(statusCodes.unauthorized)
          .json(new ErrorResponse(errorMessages.unauthorized));

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password || ""
      );

      if (!isPasswordValid)
        return res
          .status(statusCodes.unauthorized)
          .json(new ErrorResponse(errorMessages.unauthorized));

      user.password = undefined;

      const response = {
        accessToken: makeToken(user),
        userInfo: user,
      };

      return res
        .status(statusCodes.success)
        .json(new SuccessResponse(response));
    } catch (err) {
      console.log(err);
      return res
        .status(statusCodes.internalError)
        .json(new ErrorResponse(errorMessages.internalError));
    }
  },

  hello: async (req: Request, res: Response) => {
    return res
      .status(statusCodes.success)
      .json(new SuccessResponse(`Hello ${res.locals.jwtPayload.name}!`));
  },
};

export default userController;
