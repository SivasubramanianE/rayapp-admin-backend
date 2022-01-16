import { Router } from "express";
import checkAuth from "../middlewares/auth";
import userController from "../controllers/user.controller";

const routes = Router();

routes.post("/register", userController.create);
routes.post("/login", userController.login);
routes.get("/hello", checkAuth, userController.hello);

export default routes;
