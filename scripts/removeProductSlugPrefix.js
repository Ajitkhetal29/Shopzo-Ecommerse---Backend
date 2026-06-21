import mongoose from "mongoose";
import Product from "../models/product.js";

const DRY_RUN = process.argv.includes("--dry-run");
const MONGO_URI = "mongodb+srv://ajit_khetal_shapzo:gsGschwxUsJAXEQC@cluster0.d9cmpkn.mongodb.net/shopzo?appName=Cluster0";

async function removeSlugPrefix() {
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected successfully\n");

  const products = await Product.find({ slug: /^dummyjson-/ })
    .select("_id name slug")
    .sort({ createdAt: 1 });

  console.log(`\nFound ${products.length} products with dummyjson- prefix`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE UPDATE"}\n`);

  let updated = 0;
  let errors = 0;

  for (const product of products) {
    const oldSlug = product.slug;
    // Remove "dummyjson-" prefix from the beginning
    const newSlug = oldSlug.replace(/^dummyjson-/, "");

    if (oldSlug === newSlug) {
      console.log(`⊘ No change needed | ${oldSlug}`);
      continue;
    }

    if (!DRY_RUN) {
      try {
        await Product.findByIdAndUpdate(product._id, { slug: newSlug });
        console.log(`✓ Updated | ${oldSlug} → ${newSlug}`);
        updated++;
      } catch (err) {
        console.error(`✗ Error updating ${product._id}: ${err.message}`);
        errors++;
      }
    } else {
      console.log(`[DRY RUN] ✓ Would update | ${oldSlug} → ${newSlug}`);
      updated++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`Summary:`);
  console.log(`  Total with prefix: ${products.length}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`─────────────────────────────────────\n`);

  if (DRY_RUN) {
    console.log(`Run without --dry-run to apply changes`);
  }

  await mongoose.connection.close();
}

removeSlugPrefix().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
