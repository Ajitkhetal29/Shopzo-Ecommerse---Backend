import express from "express";

import { generateUploadUrl } from "../config/upload.js";


const uploadRouter = express.Router();

uploadRouter.post("/generate-upload-url", generateUploadUrl);

export default uploadRouter;