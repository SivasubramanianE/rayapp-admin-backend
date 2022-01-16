import { Router } from "express";

import checkAuth from "../middlewares/auth";
import songController from "../controllers/song.controller";
import songValidator from "../validators/song.validator";

const routes = Router();

routes.get("/", checkAuth, songValidator.get, songController.get);
routes.post("/", checkAuth, songController.create);
routes.get("/:songId", checkAuth, songController.getOne);
routes.patch(
  "/:songId",
  checkAuth,
  songValidator.update,
  songController.update
);
routes.delete("/:songId", checkAuth, songController.delete);
routes.put(
  "/:songId/master",
  checkAuth,
  // When in multipart request, always pipe multer first, else body will not be read.
  songController.upload.single("masterFilename"),
  songController.updateMasterFile
);

export default routes;
