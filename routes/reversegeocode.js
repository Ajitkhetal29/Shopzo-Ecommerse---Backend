import express from "express";
import reverseGeocode from "../utils/reverseGeocode.js";
const reverseGeocodeRouter = express.Router();

reverseGeocodeRouter.get("/:lat/:lng", reverseGeocode);
export default reverseGeocodeRouter;