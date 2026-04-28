import Subcategory from "../models/subcategory.js";
import Category from "../models/category.js";

const createSubcategory = async (req, res) => {
  try {
    const { name, slug, categoryId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!slug) {
      return res.status(400).json({ success: false, message: "Slug is required" });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ success: false, message: "Category not found" });
    }

    const existing = await Subcategory.findOne({ category: categoryId, slug });
    if (existing) {
      return res.status(400).json({ success: false, message: "Subcategory with this slug already exists in this category" });
    }

    const subcategory = await Subcategory.create({ name, slug, category: categoryId });
    const populated = await Subcategory.findById(subcategory._id).populate("category", "name slug");
    return res.status(201).json({ success: true, subcategory: populated });
  } catch (error) {
    console.error("Create subcategory error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSubcategories = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = categoryId ? { category: categoryId } : {};
    const subcategories = await Subcategory.find(filter).populate("category", "name slug").sort({ name: 1 });
    return res.status(200).json({ success: true, subcategories });
  } catch (error) {
    console.error("Get subcategories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Subcategory.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error) {
    console.error("Delete subcategory error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, categoryId } = req.body;
    const update = {};
    if (name != null) update.name = name;
    if (slug != null) update.slug = slug;
    if (categoryId != null) {
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(400).json({ success: false, message: "Category not found" });
      }
      update.category = categoryId;
    }
    await Subcategory.findByIdAndUpdate(id, update);
    return res.status(200).json({ success: true, message: "Subcategory updated successfully" });
  } catch (error) {
    console.error("Update subcategory error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export { createSubcategory, getSubcategories, deleteSubcategory, updateSubcategory };
