import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

import configService from "../singleton/configuration-service-singleton";
import { errorMessages, statusCodes } from "../utils/http-status";
import { ErrorResponse } from "../utils/response";

const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = <string>req.headers.authorization || "";

  let jwtPayload;

  try {
    jwtPayload = <any>jwt.verify(token, configService.get("jwtKey"));
    res.locals.jwtPayload = jwtPayload;
    next();
  } catch (error) {
    console.log(error);
    //If token is not valid, respond with 401 (unauthorized)
    return res
      .status(statusCodes.unauthorized)
      .json(new ErrorResponse(errorMessages.unauthorized));
  }
};

export default checkAuth;
