import Category from "../models/category.js";


const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }
    
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({ name, slug });
    return res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;
    await Category.findByIdAndUpdate(id, { name, slug });
    return res.status(200).json({ success: true, message: "Category updated successfully" });
  } catch (error) {
    console.error("Update category error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}





export { createCategory, getCategories, deleteCategory, updateCategory };