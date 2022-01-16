import { Router } from "express";

import checkAuth from "../middlewares/auth";
import albumController from "../controllers/album.controller";
import albumValidator from "../validators/album.validator";

const routes = Router();

routes.get("/", checkAuth, albumValidator.get, albumController.get);

routes.post("/", checkAuth, albumController.create);
routes.get("/:albumId", checkAuth, albumController.getOne);
routes.patch(
  "/:albumId",
  checkAuth,
  albumValidator.update,
  albumController.update
);
routes.delete("/:albumId", checkAuth, albumController.delete);
routes.patch("/:albumId/submit", checkAuth, albumController.submit);
routes.put(
  "/:albumId/cover",
  checkAuth,
  // When in multipart request, always pipe multer first, else body will not be read.
  albumController.upload.single("coverArtFile"),
  albumController.updateCoverArt
);

export default routes;
