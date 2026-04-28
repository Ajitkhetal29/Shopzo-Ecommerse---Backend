import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Category from "../models/category.js";
import Subcategory from "../models/subcategory.js";

const DATA = [
  {
    category: "Electronics",
    slug: "electronics",
    subcategories: [
      { name: "Mobile Phones", slug: "mobile-phones" },
      { name: "Laptops", slug: "laptops" },
      { name: "Tablets", slug: "tablets" },
      { name: "Smart Watches", slug: "smart-watches" },
      { name: "Headphones & Earbuds", slug: "headphones-earbuds" },
      { name: "Speakers", slug: "speakers" },
      { name: "Power Banks", slug: "power-banks" },
      { name: "Chargers & Cables", slug: "chargers-cables" },
      { name: "Cameras", slug: "cameras" },
      { name: "Computer Accessories", slug: "computer-accessories" },
    ],
  },
  {
    category: "Fashion",
    slug: "fashion",
    subcategories: [
      { name: "Men Clothing", slug: "men-clothing" },
      { name: "Women Clothing", slug: "women-clothing" },
      { name: "Kids Clothing", slug: "kids-clothing" },
      { name: "Footwear", slug: "footwear" },
      { name: "Bags & Wallets", slug: "bags-wallets" },
      { name: "Watches", slug: "watches" },
      { name: "Sunglasses", slug: "sunglasses" },
      { name: "Jewelry", slug: "jewelry" },
      { name: "Belts & Accessories", slug: "belts-accessories" },
    ],
  },
  {
    category: "Beauty & Personal Care",
    slug: "beauty-personal-care",
    subcategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Haircare", slug: "haircare" },
      { name: "Makeup", slug: "makeup" },
      { name: "Perfumes & Fragrances", slug: "perfumes-fragrances" },
      { name: "Grooming Kits", slug: "grooming-kits" },
      { name: "Personal Hygiene", slug: "personal-hygiene" },
      { name: "Beauty Tools", slug: "beauty-tools" },
    ],
  },
  {
    category: "Home & Kitchen",
    slug: "home-kitchen",
    subcategories: [
      { name: "Cookware", slug: "cookware" },
      { name: "Kitchen Appliances", slug: "kitchen-appliances" },
      { name: "Storage & Containers", slug: "storage-containers" },
      { name: "Dinnerware", slug: "dinnerware" },
      { name: "Home Decor", slug: "home-decor" },
      { name: "Lighting", slug: "lighting" },
      { name: "Bedding & Curtains", slug: "bedding-curtains" },
      { name: "Cleaning Supplies", slug: "cleaning-supplies" },
    ],
  },
  {
    category: "Grocery & Food",
    slug: "grocery-food",
    subcategories: [
      { name: "Snacks", slug: "snacks" },
      { name: "Beverages", slug: "beverages" },
      { name: "Dry Fruits", slug: "dry-fruits" },
      { name: "Spices", slug: "spices" },
      { name: "Ready to Eat", slug: "ready-to-eat" },
      { name: "Organic Foods", slug: "organic-foods" },
    ],
  },
  {
    category: "Sports & Fitness",
    slug: "sports-fitness",
    subcategories: [
      { name: "Gym Equipment", slug: "gym-equipment" },
      { name: "Yoga Accessories", slug: "yoga-accessories" },
      { name: "Sports Wear", slug: "sports-wear" },
      { name: "Outdoor Sports", slug: "outdoor-sports" },
      { name: "Fitness Trackers", slug: "fitness-trackers" },
      { name: "Cycling Gear", slug: "cycling-gear" },
    ],
  },
  {
    category: "Toys & Games",
    slug: "toys-games",
    subcategories: [
      { name: "Educational Toys", slug: "educational-toys" },
      { name: "Board Games", slug: "board-games" },
      { name: "Action Figures", slug: "action-figures" },
      { name: "Remote Control Toys", slug: "remote-control-toys" },
      { name: "Puzzles", slug: "puzzles" },
    ],
  },
  {
    category: "Books & Stationery",
    slug: "books-stationery",
    subcategories: [
      { name: "Academic Books", slug: "academic-books" },
      { name: "Novels", slug: "novels" },
      { name: "Notebooks", slug: "notebooks" },
      { name: "Art Supplies", slug: "art-supplies" },
      { name: "Office Supplies", slug: "office-supplies" },
    ],
  },
  {
    category: "Automotive",
    slug: "automotive",
    subcategories: [
      { name: "Car Accessories", slug: "car-accessories" },
      { name: "Bike Accessories", slug: "bike-accessories" },
      { name: "Car Care Products", slug: "car-care-products" },
      { name: "Helmets", slug: "helmets" },
      { name: "Riding Gear", slug: "riding-gear" },
    ],
  },
  {
    category: "Pet Supplies",
    slug: "pet-supplies",
    subcategories: [
      { name: "Pet Food", slug: "pet-food" },
      { name: "Pet Grooming", slug: "pet-grooming" },
      { name: "Pet Toys", slug: "pet-toys" },
      { name: "Pet Beds", slug: "pet-beds" },
      { name: "Pet Accessories", slug: "pet-accessories" },
    ],
  },
];

async function run() {
  await connectDB();

  let categoriesCreated = 0;
  let subcategoriesCreated = 0;

  for (const { category: catName, slug: catSlug, subcategories: subs } of DATA) {
    let cat = await Category.findOne({ name: catName });
    if (!cat) {
      cat = await Category.create({ name: catName, slug: catSlug });
      categoriesCreated++;
      console.log("  + Category:", catName, "(", catSlug, ")");
    }

    for (const { name: subName, slug: subSlug } of subs) {
      const existing = await Subcategory.findOne({ category: cat._id, slug: subSlug });
      if (!existing) {
        await Subcategory.create({ name: subName, slug: subSlug, category: cat._id });
        subcategoriesCreated++;
        console.log("    + Subcategory:", subName, "(", subSlug, ")");
      }
    }
  }

  console.log("\nDone. Categories created:", categoriesCreated, "| Subcategories created:", subcategoriesCreated);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
