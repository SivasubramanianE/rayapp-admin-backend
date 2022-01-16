import { Router } from "express";

import checkAuth from "../middlewares/auth";
import adminTracksController from "../controllers/admin.tracks.controller";
import albumValidator from "../validators/album.validator";

const routes = Router();

routes.get("/", checkAuth, albumValidator.get, adminTracksController.get);

routes.post("/", checkAuth, adminTracksController.create);
routes.get("/:albumId", checkAuth, adminTracksController.getOne);
routes.patch(
  "/:albumId",
  checkAuth,
  albumValidator.update,
  adminTracksController.update
);
routes.delete("/:albumId", checkAuth, adminTracksController.delete);
routes.patch("/:albumId/submit", checkAuth, adminTracksController.submit);
routes.put(
  "/:albumId/cover",
  checkAuth,
  // When in multipart request, always pipe multer first, else body will not be read.
  adminTracksController.upload.single("coverArtFile"),
  adminTracksController.updateCoverArt
);

export default routes;
