import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import "../config/env.js";
import connectDB from "../config/db.js";
import s3Client from "../config/s3.js";
import Product from "../models/product.js";
import Variant from "../models/variant.js";
import Category from "../models/category.js";
import Subcategory from "../models/subcategory.js";
import Vendor from "../models/vendor.js";

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const dataFile = valueAfter(
  "--file",
  path.resolve(process.cwd(), "data", "sampleProducts.json"),
);
const dryRun = hasFlag("--dry-run");
const listRefs = hasFlag("--list-refs");
const fromDummyJson = hasFlag("--from-dummyjson");
const skipExisting = hasFlag("--skip-existing");
const uploadImagesToS3 = hasFlag("--upload-images-to-s3") || fromDummyJson;
const vendorIdArg = valueAfter("--vendor-id", "");
const productLimit = Number(valueAfter("--limit", "24"));

const DUMMY_CATEGORY_MAP = {
  beauty: ["beauty-personal-care", "makeup"],
  furniture: ["home-kitchen", "home-decor"],
  fragrances: ["beauty-personal-care", "perfumes-fragrances"],
  "skin-care": ["beauty-personal-care", "skincare"],
  smartphones: ["electronics", "mobile-phones"],
  laptops: ["electronics", "laptops"],
  tablets: ["electronics", "tablets"],
  "mobile-accessories": ["electronics", "computer-accessories"],
  "mens-shirts": ["fashion", "men-clothing"],
  tops: ["fashion", "women-clothing"],
  "womens-dresses": ["fashion", "women-clothing"],
  "mens-shoes": ["fashion", "footwear"],
  "womens-shoes": ["fashion", "footwear"],
  "mens-watches": ["fashion", "watches"],
  "womens-watches": ["fashion", "watches"],
  sunglasses: ["fashion", "sunglasses"],
  "womens-bags": ["fashion", "bags-wallets"],
  "womens-jewellery": ["fashion", "jewelry"],
  "kitchen-accessories": ["home-kitchen", "kitchen-appliances"],
  "home-decoration": ["home-kitchen", "home-decor"],
  groceries: ["grocery-food", "snacks"],
  "sports-accessories": ["sports-fitness", "outdoor-sports"],
  motorcycle: ["automotive", "bike-accessories"],
  vehicle: ["automotive", "car-accessories"],
};

const PREFERRED_DUMMY_CATEGORIES = [
  "smartphones",
  "laptops",
  "tablets",
  "mobile-accessories",
  "mens-shirts",
  "tops",
  "womens-dresses",
  "mens-shoes",
  "womens-shoes",
  "womens-bags",
  "beauty",
  "fragrances",
  "skin-care",
  "kitchen-accessories",
  "furniture",
  "home-decoration",
  "groceries",
  "sports-accessories",
  "motorcycle",
  "vehicle",
  "sunglasses",
  "mens-watches",
  "womens-watches",
  "womens-jewellery",
];

function shopzoCategoryForDummyProduct(product) {
  const title = `${product.title || ""} ${product.description || ""}`.toLowerCase();
  const base = DUMMY_CATEGORY_MAP[product.category];

  if (product.category === "groceries") {
    if (/\b(cat food|dog food)\b/.test(title)) return ["pet-supplies", "pet-food"];
    if (/\b(juice|milk|beverage|drink)\b/.test(title)) return ["grocery-food", "beverages"];
    if (/\b(oil|pepper|chili|spice|masala|salt|seasoning)\b/.test(title)) return ["grocery-food", "spices"];
    if (/\b(almond|cashew|raisin|pistachio|walnut|dry fruit)\b/.test(title)) return ["grocery-food", "dry-fruits"];
    if (/\b(honey|apple|cucumber|vegetable|fruit|organic)\b/.test(title)) return ["grocery-food", "organic-foods"];
    if (/\b(meat|steak|eggs|ice cream|food)\b/.test(title)) return ["grocery-food", "ready-to-eat"];
    return ["grocery-food", "snacks"];
  }

  if (product.category === "kitchen-accessories") {
    if (/\b(spatula|whisk|knife|pot|pan|cook|utensil)\b/.test(title)) return ["home-kitchen", "cookware"];
    if (/\b(cup|plate|mug|glass|bowl)\b/.test(title)) return ["home-kitchen", "dinnerware"];
    if (/\b(box|jar|container|storage|rack|basket)\b/.test(title)) return ["home-kitchen", "storage-containers"];
    return ["home-kitchen", "kitchen-appliances"];
  }

  if (product.category === "mobile-accessories") {
    if (/\b(airpods|headphone|earphone|earbuds)\b/.test(title)) return ["electronics", "headphones-earbuds"];
    if (/\b(speaker|echo)\b/.test(title)) return ["electronics", "speakers"];
    if (/\b(power bank|battery)\b/.test(title)) return ["electronics", "power-banks"];
    if (/\b(charger|cable|adapter)\b/.test(title)) return ["electronics", "chargers-cables"];
    return ["electronics", "computer-accessories"];
  }

  if (product.category === "sports-accessories") {
    if (/\b(yoga|mat)\b/.test(title)) return ["sports-fitness", "yoga-accessories"];
    if (/\b(glove|ball|football|baseball|basketball|sport)\b/.test(title)) return ["sports-fitness", "outdoor-sports"];
    return ["sports-fitness", "gym-equipment"];
  }

  if (product.category === "furniture") {
    if (/\b(bed|sofa|chair|curtain|blanket|pillow)\b/.test(title)) return ["home-kitchen", "bedding-curtains"];
    return ["home-kitchen", "home-decor"];
  }

  return base;
}

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeImages = (images = []) => {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => {
      if (typeof image === "string") return { url: image.trim() };
      if (image && typeof image.url === "string") {
        return {
          url: image.url.trim(),
          public_id: image.public_id || undefined,
        };
      }
      return null;
    })
    .filter((image) => image?.url);
};

const fileExtFromContentType = (contentType = "") => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
};

async function uploadRemoteImageToS3(url, type, context = {}) {
  if (!url) return null;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image URL failed (${response.status}): ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error(`URL is not an image (${contentType}): ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = fileExtFromContentType(contentType);
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const safeSku = slugify(context.sku || "image").toUpperCase();
  const productId = context.productId || "seed";
  const key =
    type === "variant"
      ? `uploads/products/${productId}/variants/${safeSku}/${stamp}.${ext}`
      : `uploads/products/${productId}/${stamp}.${ext}`;

  if (dryRun) {
    console.log(`[dry-run] upload image ${url} -> s3://${process.env.AWS_BUCKET_NAME}/${key}`);
    return { url };
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return {
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    public_id: key,
  };
}

async function uploadImages(images, type, context) {
  const normalized = normalizeImages(images);
  if (!uploadImagesToS3) return normalized;

  const uploaded = [];
  for (const image of normalized) {
    uploaded.push(await uploadRemoteImageToS3(image.url, type, context));
  }
  return uploaded.filter(Boolean);
}

function buildVariantOptions(product, index) {
  const baseSku = String(product.sku || `DUMMY-${product.id}`).toUpperCase();
  const category = product.category;

  if (["mens-shirts", "tops", "womens-dresses"].includes(category)) {
    return [
      ["M", "Default"],
      ["L", "Default"],
      ["XL", "Default"],
    ].map(([size, color], idx) => ({
      sku: `${baseSku}-${size}`,
      size,
      color,
      price: Math.round(product.price * 85 + idx * 50),
      images: [product.images?.[idx % product.images.length] || product.thumbnail],
    }));
  }

  if (["mens-shoes", "womens-shoes"].includes(category)) {
    return ["7", "8", "9"].map((size, idx) => ({
      sku: `${baseSku}-${size}`,
      size,
      color: "Default",
      price: Math.round(product.price * 85 + idx * 75),
      images: [product.images?.[idx % product.images.length] || product.thumbnail],
    }));
  }

  if (["smartphones", "laptops", "tablets"].includes(category)) {
    return ["64GB", "128GB"].map((size, idx) => ({
      sku: `${baseSku}-${size}`,
      size,
      color: idx === 0 ? "Black" : "Silver",
      price: Math.round(product.price * 85 + idx * 2500),
      images: [product.images?.[idx % product.images.length] || product.thumbnail],
    }));
  }

  return [
    {
      sku: `${baseSku}-${index + 1}`,
      size: product.weight ? `${product.weight} kg` : "Standard",
      color: "Default",
      price: Math.round(product.price * 85),
      images: [product.thumbnail || product.images?.[0]].filter(Boolean),
    },
  ];
}

async function getDefaultVendor() {
  if (vendorIdArg) {
    const vendor = await Vendor.findById(vendorIdArg);
    if (!vendor) throw new Error(`Vendor not found: ${vendorIdArg}`);
    return vendor;
  }

  const vendor = await Vendor.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (!vendor) throw new Error("No active vendor found. Pass --vendor-id <id>.");
  return vendor;
}

async function buildVendorResolver() {
  if (vendorIdArg) {
    const vendor = await getDefaultVendor();
    return () => vendor;
  }

  const vendors = await Vendor.find({ isActive: true }).sort({ createdAt: -1 });
  if (!vendors.length) throw new Error("No active vendor found. Pass --vendor-id <id>.");

  const byName = (pattern) =>
    vendors.find((vendor) => pattern.test(`${vendor.name} ${vendor.email}`));

  const fallback = vendors[0];
  const categoryVendors = {
    electronics: byName(/electronics/i) || fallback,
    fashion: byName(/fashion/i) || fallback,
    "home-kitchen": byName(/home|decor/i) || fallback,
    "grocery-food": byName(/gourmet|food/i) || fallback,
    "sports-fitness": byName(/sport|fitness/i) || fallback,
    "books-stationery": byName(/book|stationery/i) || fallback,
    "beauty-personal-care": fallback,
    automotive: fallback,
  };

  return (categorySlug) => categoryVendors[categorySlug] || fallback;
}

function selectDistributedProducts(products, limit) {
  const grouped = new Map();
  for (const product of products) {
    if (!shopzoCategoryForDummyProduct(product)) continue;
    if (!grouped.has(product.category)) grouped.set(product.category, []);
    grouped.get(product.category).push(product);
  }

  const selected = [];
  while (selected.length < limit) {
    let added = false;
    for (const category of PREFERRED_DUMMY_CATEGORIES) {
      const items = grouped.get(category);
      if (!items?.length) continue;
      selected.push(items.shift());
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
  }

  return selected;
}

async function loadDummyJsonProducts() {
  const response = await fetch("https://dummyjson.com/products?limit=0");
  if (!response.ok) {
    throw new Error(`DummyJSON products fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const resolveVendor = await buildVendorResolver();
  const limit = Number.isFinite(productLimit) && productLimit > 0 ? productLimit : 24;
  const selected = selectDistributedProducts(payload.products, limit);

  return selected.map((product, index) => {
    const [category, subcategory] = shopzoCategoryForDummyProduct(product);
    const vendor = resolveVendor(category);
    return {
      name: product.title,
      slug: `dummyjson-${product.id}-${slugify(product.title)}`,
      description: product.description,
      category,
      subcategory,
      vendorId: String(vendor._id),
      status: "active",
      images: product.images?.length ? product.images.slice(0, 2) : [product.thumbnail],
      variants: buildVariantOptions(product, index),
    };
  });
}

async function printRefs() {
  const [vendors, categories] = await Promise.all([
    Vendor.find({})
      .select("name email contactNumber isActive")
      .sort({ createdAt: -1 })
      .lean(),
    Category.find({}).select("name slug").sort({ name: 1 }).lean(),
  ]);

  const subcategories = await Subcategory.find({})
    .select("name slug category")
    .sort({ name: 1 })
    .lean();

  console.log("\nVendors");
  for (const vendor of vendors) {
    console.log(
      `- ${vendor._id} | ${vendor.name} | ${vendor.email || ""} | active=${vendor.isActive}`,
    );
  }

  console.log("\nCategories / Subcategories");
  for (const category of categories) {
    console.log(`- ${category._id} | ${category.name} | ${category.slug}`);
    for (const sub of subcategories.filter(
      (item) => String(item.category) === String(category._id),
    )) {
      console.log(`  - ${sub._id} | ${sub.name} | ${sub.slug}`);
    }
  }
}

async function findVendor(item) {
  if (item.vendorId) return Vendor.findById(item.vendorId);
  if (item.vendorEmail) return Vendor.findOne({ email: item.vendorEmail });
  if (item.vendorName) return Vendor.findOne({ name: item.vendorName });
  return null;
}

async function findCategory(item) {
  const value = item.categoryId || item.category;
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return Category.findById(value);
  return Category.findOne({
    $or: [
      { slug: slugify(value) },
      { name: new RegExp(`^${escapeRegExp(value)}$`, "i") },
    ],
  });
}

async function findSubcategory(item, categoryId) {
  const value = item.subcategoryId || item.subcategory;
  if (!value) return null;
  if (mongoose.Types.ObjectId.isValid(value)) return Subcategory.findById(value);
  return Subcategory.findOne({
    category: categoryId,
    $or: [
      { slug: slugify(value) },
      { name: new RegExp(`^${escapeRegExp(value)}$`, "i") },
    ],
  });
}

async function loadProducts() {
  if (fromDummyJson) {
    const products = await loadDummyJsonProducts();
    return { products, absolutePath: "https://dummyjson.com/products?limit=0" };
  }

  const absolutePath = path.isAbsolute(dataFile)
    ? dataFile
    : path.resolve(process.cwd(), dataFile);

  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Import file must contain a JSON array of products");
  }
  return { products: parsed, absolutePath };
}

async function upsertProducts() {
  const { products, absolutePath } = await loadProducts();
  console.log(`Import file: ${absolutePath}`);
  console.log(`Mode: ${dryRun ? "dry run" : "write"}`);
  console.log(`Image storage: ${uploadImagesToS3 ? "S3" : "as provided URLs"}`);

  const stats = {
    productsCreated: 0,
    productsUpdated: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
    skipped: 0,
  };

  for (const item of products) {
    const name = String(item.name || "").trim();
    const slug = slugify(item.slug || name);
    const variants = Array.isArray(item.variants) ? item.variants : [];

    if (!name || !slug) {
      stats.skipped++;
      console.warn("Skipping product without name/slug");
      continue;
    }

    const [vendor, category] = await Promise.all([
      findVendor(item),
      findCategory(item),
    ]);

    if (!vendor) {
      throw new Error(`Vendor not found for product "${name}"`);
    }
    if (!category) {
      throw new Error(`Category not found for product "${name}"`);
    }

    const subcategory = await findSubcategory(item, category._id);
    if ((item.subcategory || item.subcategoryId) && !subcategory) {
      throw new Error(`Subcategory not found for product "${name}"`);
    }

    const productPayload = {
      name,
      slug,
      description: item.description || "",
      category: category._id,
      subcategory: subcategory?._id || undefined,
      vendor: vendor._id,
      status: item.status || "active",
    };

    const existingProduct = await Product.findOne({ slug });
    let product = existingProduct;

    if (existingProduct && skipExisting) {
      console.log(`Skipping existing product ${slug}`);
      stats.skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `[dry-run] ${existingProduct ? "update" : "create"} product ${slug}`,
      );
    } else if (existingProduct) {
      product = await Product.findByIdAndUpdate(existingProduct._id, productPayload, {
        new: true,
        runValidators: true,
      });
      stats.productsUpdated++;
    } else {
      product = await Product.create(productPayload);
      stats.productsCreated++;
    }

    productPayload.images = await uploadImages(item.images, "product", {
      productId: product?._id || existingProduct?._id || slug,
    });

    if (!dryRun && productPayload.images.length) {
      product.images = productPayload.images;
      await product.save();
    }

    for (const variant of variants) {
      const sku = String(variant.sku || "").trim().toUpperCase();
      if (!sku) {
        stats.skipped++;
        console.warn(`Skipping variant without SKU for product "${name}"`);
        continue;
      }

      const variantPayload = {
        product: product?._id || existingProduct?._id,
        sku,
        size: String(variant.size || "").trim(),
        color: String(variant.color || "").trim(),
        price: Number(variant.price),
        images: await uploadImages(variant.images, "variant", {
          productId: product?._id || existingProduct?._id,
          sku,
        }),
      };

      if (!Number.isFinite(variantPayload.price) || variantPayload.price < 0) {
        throw new Error(`Invalid price for SKU "${sku}"`);
      }

      const existingVariant = await Variant.findOne({ sku });
      if (dryRun) {
        console.log(
          `[dry-run] ${existingVariant ? "update" : "create"} variant ${sku}`,
        );
      } else if (existingVariant) {
        await Variant.findByIdAndUpdate(existingVariant._id, variantPayload, {
          runValidators: true,
        });
        stats.variantsUpdated++;
      } else {
        await Variant.create(variantPayload);
        stats.variantsCreated++;
      }
    }
  }

  console.log("\nDone");
  console.table(stats);
}

async function run() {
  await connectDB();

  if (listRefs) {
    await printRefs();
  } else {
    await upsertProducts();
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
