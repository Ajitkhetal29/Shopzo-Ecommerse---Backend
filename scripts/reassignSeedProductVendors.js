import "../config/env.js";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Product from "../models/product.js";
import Vendor from "../models/vendor.js";
import "../models/category.js";
import "../models/subcategory.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const vendorRules = [
  {
    key: "electronics",
    patterns: [/electronics/i],
    categories: ["electronics", "automotive"],
  },
  {
    key: "fashion",
    patterns: [/fashion/i],
    categories: ["fashion", "beauty-personal-care"],
  },
  {
    key: "home",
    patterns: [/home|decor/i],
    categories: ["home-kitchen"],
  },
  {
    key: "sports",
    patterns: [/sport|fitness/i],
    categories: ["sports-fitness"],
  },
  {
    key: "books",
    patterns: [/book|stationery/i],
    categories: ["books-stationery", "toys-games"],
  },
  {
    key: "grocery",
    patterns: [/gourmet|food/i],
    categories: ["grocery-food", "pet-supplies"],
  },
];

function vendorForRule(vendors, rule) {
  return vendors.find((vendor) =>
    rule.patterns.some((pattern) => pattern.test(`${vendor.name} ${vendor.email}`)),
  );
}

async function run() {
  await connectDB();

  const vendors = await Vendor.find({ isActive: true }).select("name email").lean();
  const byCategory = new Map();
  const missingRules = [];

  for (const rule of vendorRules) {
    const vendor = vendorForRule(vendors, rule);
    if (!vendor) {
      missingRules.push(rule.key);
      continue;
    }
    for (const category of rule.categories) byCategory.set(category, vendor);
  }

  if (missingRules.length) {
    throw new Error(`No matching vendor found for rules: ${missingRules.join(", ")}`);
  }

  const products = await Product.find({ slug: /^dummyjson-/ })
    .populate("category", "name slug")
    .populate("subcategory", "name slug")
    .populate("vendor", "name email")
    .select("name slug category subcategory vendor")
    .sort({ createdAt: 1 });

  const stats = {
    scanned: products.length,
    changed: 0,
    unchanged: 0,
    skipped: 0,
  };
  const summary = new Map();

  for (const product of products) {
    const categorySlug = product.category?.slug;
    const targetVendor = byCategory.get(categorySlug);

    if (!targetVendor) {
      stats.skipped++;
      console.log(`skip | no vendor rule | ${categorySlug || "missing"} | ${product.name}`);
      continue;
    }

    const currentVendorId = String(product.vendor?._id || product.vendor);
    const targetVendorId = String(targetVendor._id);
    const summaryKey = `${categorySlug} -> ${targetVendor.name}`;
    summary.set(summaryKey, (summary.get(summaryKey) || 0) + 1);

    if (currentVendorId === targetVendorId) {
      stats.unchanged++;
      continue;
    }

    stats.changed++;
    console.log(
      `${dryRun ? "would update" : "updated"} | ${product.name} | ${product.vendor?.name || "missing"} -> ${targetVendor.name}`,
    );

    if (!dryRun) {
      product.vendor = targetVendor._id;
      await product.save();
    }
  }

  console.log("\nVendor rules");
  for (const [key, count] of [...summary.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${count} | ${key}`);
  }

  console.log("\nDone");
  console.table(stats);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
