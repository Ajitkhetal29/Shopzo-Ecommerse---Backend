import Inventory from "../models/inventory.js";
import Warehouse from "../models/warehouse.js";
import Vendor from "../models/vendor.js";
import Variant from "../models/variant.js";
import { getViewUrl } from "../config/upload.js";
import { recomputeAvailable } from "../utils/inventoryStock.js";

const getKeyFromUrl = (url) => {
    try {
        const parsed = new URL(url);
        return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    } catch (_) {
        return "";
    }
};

const addViewUrlsToVariantImages = async (variant) => {
    if (!variant || !Array.isArray(variant.images)) return variant;

    const signedImages = [];
    for (const img of variant.images) {
        if (!img?.url) {
            signedImages.push(img);
            continue;
        }

        const key = getKeyFromUrl(img.url);
        if (!key) {
            signedImages.push(img);
            continue;
        }

        try {
            const viewUrl = await getViewUrl(key);
            signedImages.push({ ...img, url: viewUrl });
        } catch (_) {
            signedImages.push(img);
        }
    }

    return { ...variant, images: signedImages };
};


const createInventory = async (req, res) => {
    try {
        const { variantId, warehouseId, vendorId, quantity } = req.body;


        if (warehouseId) {
            const warehouseDoc = await Warehouse.findById(warehouseId);
            if (!warehouseDoc) {
                return res.status(400).json({
                    success: false,
                    message: "Warehouse not found",
                });
            }
        }

        if (variantId) {
            const variantDoc = await Variant.findById(variantId);
            if (!variantDoc) {
                return res.status(400).json({
                    success: false,
                    message: "Variant not found",
                });
            }
        }

        if (vendorId) {
            const vendorDoc = await Vendor.findById(vendorId);
            if (!vendorDoc) {
                return res.status(400).json({
                    success: false,
                    message: "Vendor not found",
                });
            }
        }

        if (warehouseId && vendorId) {
            return res.status(400).json({
                success: false,
                message: "Warehouse and vendor cannot be used together",
            });
        }

        const locationType = warehouseId ? "warehouse" : "vendor";
        if (locationType === "warehouse") {
            const existingInventory = await Inventory.findOne({ variant: variantId, warehouse: warehouseId });
            if (existingInventory) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory already exists",
                });
            }
        }
        if (locationType === "vendor") {
            const existingInventory = await Inventory.findOne({ variant: variantId, vendor: vendorId });
            if (existingInventory) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory already exists",
                });
            }
        }

        const inventory = await Inventory.create({
            variant: variantId,
            warehouse: warehouseId,
            vendor: vendorId,
            quantity,
            locationType,
            reserved: 0,
            missingHold: 0,
            damagedQty: 0,
            extraHold: 0,
        });
        recomputeAvailable(inventory);
        await inventory.save();

        return res.status(201).json({
            success: true,
            message: "Inventory created successfully",
            inventory,
        });



    } catch (error) {
        console.error("Create inventory error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getInventory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            warehouseId,
            vendorId,
        } = req.query;
        const skip =
            (Math.max(1, parseInt(page, 10)) - 1) *
            Math.min(100, Math.max(1, parseInt(limit, 10)));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

        if (warehouseId && vendorId) {
            return res.status(400).json({
                success: false,
                message: "Warehouse and vendor cannot be used together",
            });
        }

        const filter = {};
        if (warehouseId) filter.warehouse = warehouseId;
        if (vendorId) filter.vendor = vendorId;

        const [inventory, totalCount] = await Promise.all([
            Inventory.find(filter)
                .populate("variant", "name sku images")
                .populate("warehouse", "name location address")
                .populate("vendor", "name location address")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Inventory.countDocuments(filter),
        ]);

        const inventoryWithViewUrls = [];
        for (const row of inventory) {
            const signedVariant = await addViewUrlsToVariantImages(row.variant);
            inventoryWithViewUrls.push({
                ...row,
                variant: signedVariant,
            });
        }

        return res.status(200).json({
            success: true,
            message: "Inventory fetched successfully",
            inventory: inventoryWithViewUrls,
            totalCount,
            page: parseInt(page, 10),
            limit: limitNum,
        });
    } catch (error) {
        console.error("Get inventory error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const updateInventory = async (req, res) => {
    try {
        const { inventoryId, quantity } = req.body;
        if (!inventoryId || quantity === undefined || quantity === null) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }
        const existing = await Inventory.findById(inventoryId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }
        existing.quantity = Number(quantity);
        recomputeAvailable(existing);
        const inventory = await existing.save({ validateBeforeSave: true });

        return res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            inventory,
        });
    } catch (error) {
        console.error("Update inventory error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};


const deleteInventory = async (req, res) => {
    try {
        const { inventoryId } = req.body;
        if (!inventoryId) {
            return res.status(400).json({
                success: false,
                message: "Inventory id is required",
            });
        }
        const inventory = await Inventory.findById(inventoryId);
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }
        await Inventory.findByIdAndDelete(inventoryId);
        return res.status(200).json({
            success: true,
            message: "Inventory deleted successfully",
        });
    } catch (error) {
        console.error("Delete inventory error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


const getInventoryById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Inventory id is required",
            });
        }
        const inventory = await Inventory.findById(id)
            .populate("variant", "name sku images")
            .populate("warehouse", "name location address")
            .populate("vendor", "name location address");
        if (!inventory) {
            return res.status(404).json({
                success: false,
                message: "Inventory not found",
            });
        }
        const signedVariant = await addViewUrlsToVariantImages(inventory.variant);

        return res.status(200).json({
            success: true,
            message: "Inventory fetched successfully",
            inventory: {
                ...inventory.toObject(),
                variant: signedVariant,
            },
        });
    } catch (error) {
        console.error("Get inventory by id error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};












export { createInventory, getInventory, updateInventory, deleteInventory, getInventoryById };   