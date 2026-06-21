import Product from "../models/product.js";
import Category from "../models/category.js";
import Subcategory from "../models/subcategory.js";
import Vendor from "../models/vendor.js";
import Variant from "../models/variant.js";
import { getViewUrl, deleteFileByKey } from "../config/upload.js";

const getKeyFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch (_) {
    return "";
  }
};

const isS3Url = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("amazonaws.com");
  } catch (_) {
    return false;
  }
};

const deleteImagesFromS3 = async (images = []) => {
  for (const img of images) {
    const url = img?.url;
    if (!url || !isS3Url(url)) continue;

    const key = getKeyFromUrl(url);
    if (!key) continue;

    try {
      await deleteFileByKey(key);
    } catch (error) {
      console.error("S3 delete failed:", error);
    }
  }
};

const addViewUrlsToImages = async (images = []) => {
  const result = [];

  for (const img of images) {
    if (!img?.url) {
      result.push(img);
      continue;
    }

    const key = getKeyFromUrl(img.url);
    if (!key) {
      result.push(img);
      continue;
    }

    try {
      const viewUrl = await getViewUrl(key);
      result.push({ ...img, url: viewUrl });
    } catch (_) {
      result.push(img);
    }
  }

  return result;
};

const addViewUrlsToEntity = async (entity) => {
  if (!entity) return entity;
  const plain = typeof entity.toObject === "function" ? entity.toObject() : entity;
  return {
    ...plain,
    images: await addViewUrlsToImages(plain.images || []),
  };
};

const parseImageUrls = (rawValue) => {
  if (!rawValue) return [];
  const parsed = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((url) => typeof url === "string" && url.trim())
    .map((url) => ({ url: url.trim() }));
};

const createProduct = async (req, res) => {
  const { name, description, categoryId, subcategoryId, vendorId, slug } =
    req.body;

  try {
    if (!name || !categoryId || !vendorId) {
      return res.status(400).json({
        success: false,
        message: "Name, category and vendor are required",
      });
    }
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug could not be generated from name",
      });
    }

    const existingCategory = await Category.findById(categoryId);
    const existingVendor = await Vendor.findById(vendorId);

    if (!existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!existingVendor) {
      return res.status(400).json({
        success: false,
        message: "vendor not found",
      });
    }

    let subcategory = null;
    if (subcategoryId) {
      const existingSub = await Subcategory.findById(subcategoryId);
      if (!existingSub) {
        return res.status(400).json({
          success: false,
          message: "Subcategory not found",
        });
      }
      if (String(existingSub.category) !== String(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Subcategory does not belong to the selected category",
        });
      }
      subcategory = subcategoryId;
    }

    let imageList = [];
    try {
      imageList = parseImageUrls(req.body.imageUrls);
    } catch (_) {
      return res.status(400).json({
        success: false,
        message: "imageUrls must be a valid JSON array",
      });
    }

    const product = new Product({
      name,
      slug,
      description: description ?? "",
      category: categoryId,
      subcategory: subcategory ?? undefined,
      vendor: vendorId,
      images: imageList,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product Added Successfully",
    });
  } catch (error) {
    console.error(error);
    const isCloudinaryConfig =
      error?.message?.includes("api_key") ||
      error?.message?.includes("Must supply");
    res.status(500).json({
      success: false,
      message: isCloudinaryConfig
        ? "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env"
        : "Something went wrong while adding product.",
    });
  }
};

const pickRandom = (list, count) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

// 4 random categories, each with 4 random products (for buyer home)
const getHomeCategoryShowcase = async (req, res) => {
  try {
    const categoryIds = await Product.distinct("category");
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const pickedCategories = pickRandom(categories, Math.min(4, categories.length));

    const sections = [];

    for (const cat of pickedCategories) {
      let products = await Product.find({ category: cat._id, status: "active" })
        .populate("subcategory", "name slug")
        .lean();

      if (products.length === 0) {
        products = await Product.find({ category: cat._id })
          .populate("subcategory", "name slug")
          .lean();
      }

      const pickedProducts = pickRandom(products, Math.min(4, products.length));
      const productsWithUrls = [];

      for (const product of pickedProducts) {
        productsWithUrls.push(await addViewUrlsToEntity(product));
      }

      sections.push({
        category: { _id: cat._id, name: cat.name, slug: cat.slug },
        products: productsWithUrls.map((p) => ({
          _id: p._id,
          name: p.name,
          slug: p.slug,
          images: p.images || [],
          subcategory: p.subcategory || null,
        })),
      });
    }

    return res.status(200).json({ success: true, sections });
  } catch (error) {
    console.error("Home category showcase error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// 10 products for a subcategory (buyer carousel)
const getProductsBySubcategory = async (req, res) => {
  try {
    const { subcategoryName } = req.query;

    if (!subcategoryName || !String(subcategoryName).trim()) {
      return res.status(400).json({
        success: false,
        message: "subcategoryName is required",
      });
    }

    const name = String(subcategoryName).trim();
    const subcategory = await Subcategory.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    let products = await Product.find({
      subcategory: subcategory._id,
      status: "active",
    })
      .limit(10)
      .lean();

    if (products.length === 0) {
      products = await Product.find({ subcategory: subcategory._id }).limit(10).lean();
    }

    const list = [];

    for (const product of products) {
      const withUrls = await addViewUrlsToEntity(product);
      list.push({
        _id: withUrls._id,
        name: withUrls.name,
        slug: withUrls.slug,
        image: withUrls.images?.[0]?.url || "",
      });
    }

    return res.status(200).json({ success: true, products: list });
  } catch (error) {
    console.error("Products by subcategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const attachMinPrices = async (products = []) => {
  if (products.length === 0) return products;

  const productIds = products.map((product) => product._id);
  const priceRows = await Variant.aggregate([
    { $match: { product: { $in: productIds } } },
    { $group: { _id: "$product", minPrice: { $min: "$price" } } },
  ]);

  const priceMap = new Map(
    priceRows.map((row) => [String(row._id), row.minPrice]),
  );

  return products.map((product) => ({
    ...product,
    minPrice: priceMap.get(String(product._id)) ?? null,
  }));
};

const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      subcategoryId,
      vendorId,
      minPrice,
      maxPrice,
    } = req.query;
    const skip =
      (Math.max(1, parseInt(page, 10)) - 1) *
      Math.min(100, Math.max(1, parseInt(limit, 10)));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const filter = { status: "active" };
    if (categoryId) filter.category = categoryId;
    if (subcategoryId) filter.subcategory = subcategoryId;
    if (vendorId) filter.vendor = vendorId;

    if (minPrice || maxPrice) {
      const priceMatch = {};
      if (minPrice) priceMatch.$gte = parseFloat(minPrice);
      if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

      const matchingProducts = await Variant.aggregate([
        { $group: { _id: "$product", minPrice: { $min: "$price" } } },
        { $match: { minPrice: priceMatch } },
      ]);

      filter._id = {
        $in: matchingProducts.map((row) => row._id),
      };
    }

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .populate("vendor", "name contactNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const productsWithPrices = await attachMinPrices(products);
    const productsWithViewUrls = [];

    for (const product of productsWithPrices) {
      productsWithViewUrls.push(await addViewUrlsToEntity(product));
    }

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products: productsWithViewUrls,
      totalCount,
      page: parseInt(page, 10),
      limit: limitNum,
    });
  } catch (error) {
    console.error("Get products error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await Variant.find({ product: id });

    await deleteImagesFromS3(product.images || []);
    for (const variant of variants) {
      await deleteImagesFromS3(variant.images || []);
    }

    await Variant.deleteMany({ product: id });
    await Product.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productFound = await Product.findById(id)
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .populate("vendor", "name");

    const productWithViewUrls = await addViewUrlsToEntity(productFound);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product: productWithViewUrls,
    });
  } catch (error) {
    console.error("Get product by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const product = await Product.findOne({ slug, status: "active" })
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .populate("vendor", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productWithViewUrls = await addViewUrlsToEntity(product);

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product: productWithViewUrls,
    });
  } catch (error) {
    console.error("Get product by slug error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, categoryId, subcategoryId, vendorId, slug } =
    req.body;

  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!name || !categoryId || !vendorId) {
      return res.status(400).json({
        success: false,
        message: "Name, category and vendor are required",
      });
    }
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    const existingCategory = await Category.findById(categoryId);
    const existingVendor = await Vendor.findById(vendorId);

    if (!existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }
    if (!existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let subcategory = null;
    if (subcategoryId) {
      const existingSub = await Subcategory.findById(subcategoryId);
      if (!existingSub) {
        return res.status(400).json({
          success: false,
          message: "Subcategory not found",
        });
      }
      if (String(existingSub.category) !== String(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Subcategory does not belong to the selected category",
        });
      }
      subcategory = subcategoryId;
    }

    product.name = name;
    product.slug = slug.toLowerCase().trim();
    product.description = description ?? "";
    product.category = categoryId;
    product.subcategory = subcategory ?? undefined;
    product.vendor = vendorId;

    // Keep existing images by indices (from body.keepImageIndices JSON array), then append new uploads
    let keepIndices = [];
    try {
      if (
        typeof req.body.keepImageIndices === "string" &&
        req.body.keepImageIndices
      ) {
        keepIndices = JSON.parse(req.body.keepImageIndices);
      }
    } catch (_) {}
    const existingList = product.images || [];
    const keptExisting =
      Array.isArray(keepIndices) && keepIndices.length > 0
        ? keepIndices
            .filter(
              (i) => Number.isInteger(i) && i >= 0 && i < existingList.length,
            )
            .map((i) => existingList[i])
        : existingList;
    let newUploads = [];
    try {
      newUploads = parseImageUrls(req.body.imageUrls);
    } catch (_) {
      return res.status(400).json({
        success: false,
        message: "imageUrls must be a valid JSON array",
      });
    }
    product.images = [...keptExisting, ...newUploads];

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Slug already in use by another product",
      });
    }
    const isCloudinaryConfig =
      error?.message?.includes("api_key") ||
      error?.message?.includes("Must supply");
    return res.status(500).json({
      success: false,
      message: isCloudinaryConfig
        ? "Cloudinary is not configured."
        : "Internal server error",
    });
  }
};

const addVariant = async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { productId, size, color, price, sku } = req.body;

    // 🔹 Basic validation
    if (!productId || !size || !color || !price || !sku) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Check product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🔹 Upload images
    let imageList = [];
    try {
      imageList = parseImageUrls(req.body.imageUrls);
    } catch (_) {
      return res.status(400).json({
        success: false,
        message: "imageUrls must be a valid JSON array",
      });
    }

    // 🔹 Create variant
    const newVariant = await Variant.create({
      product: productId,
      size,
      color,
      price,
      sku,
      images: imageList,
    });

    return res.status(201).json({
      success: true,
      message: "Variant created successfully",
      variant: newVariant,
    });
  } catch (error) {
    console.error("ADD VARIANT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding variant",
    });
  }
};

const getProductvariants = async (req, res) => {
  console.log("GET VARIANTS CALLED WITH PARAMS:", req.params);
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    console.log("Fetching variants for productId:", productId);

    const variants = await Variant.find({ product: productId }).lean();
    const variantsWithViewUrls = [];
    for (const variant of variants) {
      variantsWithViewUrls.push(await addViewUrlsToEntity(variant));
    }
    return res.status(200).json({
      success: true,
      message: "Variants fetched successfully",
      variants: variantsWithViewUrls,
    });
  } catch (error) {
    console.error("GET VARIANTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching variants",
    });
  }
};

const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, color, price, sku, existingImages } = req.body;

    // 🔹 Parse existing images safely
    let parsedExistingImages = [];
    if (existingImages) {
      const parsed = typeof existingImages === "string" ? JSON.parse(existingImages) : existingImages;
      parsedExistingImages = Array.isArray(parsed)
        ? parsed.filter((img) => img && typeof img.url === "string")
        : [];
    }

    // 🔹 Upload new images
    let newImageList = [];
    try {
      newImageList = parseImageUrls(req.body.imageUrls);
    } catch (_) {
      return res.status(400).json({
        success: false,
        message: "imageUrls must be a valid JSON array",
      });
    }

    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    // 🔥 STEP 1: FIND REMOVED IMAGES
    const removedImages = variant.images.filter(
      (img) => !parsedExistingImages.some((e) => e.url === img.url),
    );

    // 🔥 STEP 2: DELETE FROM CLOUD (IMPORTANT)
    await deleteImagesFromS3(removedImages);

    // 🔥 STEP 3: FINAL IMAGE LIST
    const finalImages = [...parsedExistingImages, ...newImageList];

    // 🔹 Update fields
    variant.size = size;
    variant.color = color;
    variant.price = price;
    variant.sku = sku;
    variant.images = finalImages;

    await variant.save();

    return res.status(200).json({
      success: true,
      message: "Variant updated successfully",
    });
  } catch (error) {
    console.error("UPDATE VARIANT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating variant",
    });
  }
};

const getVariantById = async (req, res) => {
  try {
    const { id } = req.params;
    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    const variantWithViewUrls = await addViewUrlsToEntity(variant);

    return res.status(200).json({
      success: true,
      message: "Variant fetched successfully",
      variant: variantWithViewUrls,
    });
  } catch (error) {
    console.error("Get variant by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const variant = await Variant.findById(id);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    await deleteImagesFromS3(variant.images || []);
    await Variant.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    console.error("Delete variant error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  createProduct,
  getProducts,
  getProductsBySubcategory,
  getHomeCategoryShowcase,
  deleteProduct,
  getProductById,
  getProductBySlug,
  updateProduct,
  addVariant,
  getProductvariants,
  updateVariant,
  getVariantById,
  deleteVariant,
};
