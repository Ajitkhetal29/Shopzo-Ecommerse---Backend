import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only images (jpeg, png, gif, webp) allowed"));
  },
});

export default upload;
