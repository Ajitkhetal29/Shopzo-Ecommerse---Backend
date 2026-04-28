import Department from "../models/department.js";

export const createDepartment = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required",
      });
    }

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      name,
      description,
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === "true";

    const departments = await Department.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Get department error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (name) {
      const existingDepartment = await Department.findOne({
        name,
        _id: { $ne: id },
      });
      if (existingDepartment) {
        return res.status(409).json({
          success: false,
          message: "Department name already exists",
        });
      }
      department.name = name;
    }

    if (description !== undefined) department.description = description;

    if (typeof isActive === "boolean") {
      department.isActive = isActive;
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (error) {
    console.error("Update department error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Soft delete
    await Department.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

};
