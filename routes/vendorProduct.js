import express from "express";
import { vendorAuthMiddleware } from "../middleware/auth.js";
import {
  vendorCreateProduct,
  vendorListProducts,
  vendorGetProductById,
  vendorDeleteProduct,
  vendorUpdateProduct,
  vendorAddVariant,
  vendorGetProductVariants,
  vendorGetVariantById,
  vendorUpdateVariant,
  vendorDeleteVariant,
} from "../controllers/vendorProduct.js";

const vendorProductRouter = express.Router();

vendorProductRouter.use(vendorAuthMiddleware);

vendorProductRouter.get("/list", vendorListProducts);
vendorProductRouter.post("/add", vendorCreateProduct);
vendorProductRouter.delete("/delete/:id", vendorDeleteProduct);
vendorProductRouter.put("/update/:id", vendorUpdateProduct);

vendorProductRouter.post("/variants/add", vendorAddVariant);
vendorProductRouter.get("/variants/product/:productId", vendorGetProductVariants);
vendorProductRouter.get("/variants/:id", vendorGetVariantById);
vendorProductRouter.put("/variants/update/:id", vendorUpdateVariant);
vendorProductRouter.delete("/variants/delete/:id", vendorDeleteVariant);

/** Must be after /variants/* and /delete/:id /update/:id */
vendorProductRouter.get("/:id", vendorGetProductById);

export default vendorProductRouter;
