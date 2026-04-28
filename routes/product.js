import express from "express";
import { createProduct, getProducts, deleteProduct, getProductById, updateProduct , addVariant, getProductvariants,
    getVariantById, updateVariant, deleteVariant
} from "../controllers/product.js";

const productRouter = express.Router();

productRouter.get("/list",  getProducts);
productRouter.post("/add",  createProduct);
productRouter.delete("/delete/:id",  deleteProduct);
productRouter.get("/:id",  getProductById);
productRouter.put("/update/:id",  updateProduct);
productRouter.post("/variants/add",  addVariant);
productRouter.get("/variants/:id",  getVariantById);
productRouter.put("/variants/update/:id",  updateVariant);
productRouter.delete("/variants/delete/:id",  deleteVariant);
productRouter.get("/variants/product/:productId", getProductvariants);


export default productRouter;
