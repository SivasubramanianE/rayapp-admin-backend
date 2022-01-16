import { Router } from "express";

import songRouter from "./song.route";
import albumRouter from "./album.route";
import userRouter from "./user.route";
import adminTracksRouter from "./admin.tracks.route";

// Models
import userController from "../controllers/user.controller";
import checkAuth from "../middlewares/auth";

const routes = Router();

routes.use("/songs", songRouter);

routes.use("/albums", albumRouter);

routes.use("/users", userRouter);


// Admin 

routes.use("/admin/tracks", adminTracksRouter);

export default routes;
