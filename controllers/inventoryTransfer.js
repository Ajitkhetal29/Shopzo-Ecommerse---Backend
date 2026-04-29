import mongoose from "mongoose";
import inventoryTransfer from "../models/inventoryTransfer.js";
import TransferStatusHistory from "../models/transferStatushistory.js";
import TransferIssue from "../models/transferIssue.js";
import Inventory from "../models/inventory.js";
import { getViewUrl } from "../config/upload.js";
import { statusRules } from "../utils/status.js";
import { recomputeAvailable } from "../utils/inventoryStock.js";

/**
 * If a transfer reached delivered without enough reservation on the sender row
 * (legacy data / manual DB edits), backfill reservation from available up to needQty.
 */
const ensureSenderReservedQty = async (senderInventory, needQty, session) => {
    const need = Number(needQty) || 0;
    if (need <= 0) return;

    let reserved = Number(senderInventory.reserved ?? 0);
    if (reserved >= need) return;

    const deficit = need - reserved;
    const available = Number(senderInventory.available ?? 0);
    if (available < deficit) {
        throw new Error("Sender has insufficient available stock to cover transfer reservation");
    }

    reserved += deficit;
    senderInventory.reserved = reserved;
    recomputeAvailable(senderInventory);
    await senderInventory.save({ session });
};

const ISSUE_RESOLUTION_RULES = {
    damaged: ["return", "replace"],
    missing: ["replace", "adjust"],
    extra: ["return", "adjust"],
};

const getOrCreateInventory = async (locationType, locationId, variantId, session) => {
    const filter =
        locationType === "warehouse"
            ? { variant: variantId, warehouse: locationId }
            : { variant: variantId, vendor: locationId };
    let doc = await Inventory.findOne(filter).session(session);
    if (doc) return doc;

    doc = await Inventory.create(
        [
            {
                variant: variantId,
                warehouse: locationType === "warehouse" ? locationId : null,
                vendor: locationType === "vendor" ? locationId : null,
                quantity: 0,
                reserved: 0,
                available: 0,
                missingHold: 0,
                damagedQty: 0,
                extraHold: 0,
                locationType,
            },
        ],
        { session }
    ).then((docs) => docs[0]);

    return doc;
};

const getKeyFromUrl = (url) => {
    try {
        const parsed = new URL(url);
        return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    } catch (_) {
        return "";
    }
};

const createInventoryTransferRequest = async (req, res) => {
    try {
        const { variantsData, fromType, fromId, toType, toId, totalQuantity } =
            req.body;

        if (
            !variantsData ||
            !fromType ||
            !fromId ||
            !toType ||
            !toId ||
            totalQuantity === undefined ||
            totalQuantity === null
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (!Array.isArray(variantsData) || variantsData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid variants data",
            });
        }

        if (
            variantsData.some(
                (row) =>
                    !row.variantId ||
                    row.quantity === undefined ||
                    row.quantity === null ||
                    Number(row.quantity) < 1
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid variants data",
            });
        }

        const sumOfQuantities = variantsData.reduce(
            (sum, row) => sum + Number(row.quantity),
            0
        );
        if (sumOfQuantities !== Number(totalQuantity)) {
            return res.status(400).json({
                success: false,
                message: "Total quantity does not match the sum of quantities",
            });
        }

        const fromModel = fromType === "vendor" ? "Vendor" : "Warehouse";
        const toModel = toType === "vendor" ? "Vendor" : "Warehouse";

        const items = variantsData.map((row) => ({
            variant: row.variantId,
            quantity: Number(row.quantity),
        }));

        const transferRequest = await inventoryTransfer.create({
            items,
            fromType,
            fromId,
            fromModel,
            toType,
            toId,
            toModel,
            totalQuantity: sumOfQuantities,
        });

        await TransferStatusHistory.create({
            transferRequest: transferRequest._id,
            status: "initiated",
            changedAt: new Date(),
            changedByType: fromType,
            changedByModel: fromModel,
            changedById: fromId,
        });


        return res.status(200).json({
            success: true,
            message: "Transfer request created successfully",
            transferRequest,
        });
    } catch (error) {
        console.error("Create inventory transfer request error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getInventoryTransferRequests = async (req, res) => {
    try {
        const { fromType, fromId, toType, toId, status, page, limit } = req.query;
        const filter = {};
        if (fromType) filter.fromType = fromType;
        if (fromId) filter.fromId = fromId;
        if (toType) filter.toType = toType;
        if (toId) filter.toId = toId;
        if (status && status !== "all") {
            if (status === "active") {
                filter.status = {
                    $in: [
                        "initiated",
                        "approved",
                        "shipped",
                        "delivered",
                        "issue_reported",
                    ],
                };
            } else if (status === "completed") {
                filter.status = "completed";
            } else if (status === "reject") {
                filter.status = "rejected";
            } else {
                filter.status = status;
            }
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const [rows, totalCount] = await Promise.all([
            inventoryTransfer
                .find(filter)
                .select(
                    "_id fromType fromId fromModel toType toId toModel totalQuantity status initiatedAt createdAt updatedAt"
                )
                .populate("fromId", "name")
                .populate("toId", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            inventoryTransfer.countDocuments(filter),
        ]);

        const transferRequests = rows.map((t) => ({
            _id: t._id,
            fromType: t.fromType,
            toType: t.toType,
            fromId: t.fromId,
            toId: t.toId,
            fromModel: t.fromModel,
            toModel: t.toModel,
            totalQuantity: t.totalQuantity,
            status: t.status,
            initiatedAt: t.initiatedAt,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            fromName: t.fromId?.name ?? null,
            toName: t.toId?.name ?? null,
        }));

        return res.status(200).json({
            success: true,
            message: "Inventory transfer requests fetched successfully",
            transferRequests,
            totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum) || 1,
        });
    } catch (error) {
        console.error("Get inventory transfer requests error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getInventoryTransferRequestById = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id || !mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Valid transfer id is required",
            });
        }

        const doc = await inventoryTransfer
            .findById(id)
            .populate("items.variant", "sku images")
            .populate("fromId", "name")
            .populate("toId", "name")
            .lean();

        if (!doc) {
            return res.status(404).json({
                success: false,
                message: "Transfer request not found",
            });
        }

        const historyRows = await TransferStatusHistory.find({
            transferRequest: id,
        })
            .sort({ changedAt: 1 })
            .populate("changedById", "name")
            .lean();

        const statusHistory = historyRows.map((h) => ({
            status: h.status,
            changedAt: h.changedAt,
            changedByType: h.changedByType,
            changedByModel: h.changedByModel,
            changedById: h.changedById,
            changedByName: h.changedById?.name ?? null,
        }));

        const transfer = {
            ...doc,
            statusHistory,
        };

        return res.status(200).json({
            success: true,
            message: "Transfer request fetched successfully",
            transfer,
        });
    } catch (error) {
        console.error("Get inventory transfer request by id error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getInventoryTransferStatusRules = async (req, res) => {
    try {
        const { currentStatus, actorType } = req.query;

        const normalizedActorType =
            actorType === "vendor" || actorType === "warehouse" ? actorType : null;

        const normalizedCurrentStatus =
            typeof currentStatus === "string" && statusRules[currentStatus]
                ? currentStatus
                : null;

        const allowedStatuses =
            normalizedActorType && normalizedCurrentStatus
                ? statusRules[normalizedCurrentStatus][normalizedActorType]?.can ?? []
                : [];

        return res.status(200).json({
            success: true,
            statusRules,
            allowedStatuses,
            currentStatus: normalizedCurrentStatus,
            actorType: normalizedActorType,
        });
    } catch (error) {
        console.error("Get inventory transfer status rules error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getTransferIssues = async (req, res) => {
    try {
        const { userType, userId, issueStatus, issueType, page, limit } = req.query;
        if (
            !userType ||
            !userId ||
            !["vendor", "warehouse"].includes(userType) ||
            !mongoose.isValidObjectId(String(userId))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid userType and userId are required",
            });
        }

        const transferIds = await inventoryTransfer
            .find({
                $or: [
                    { fromType: userType, fromId: userId },
                    { toType: userType, toId: userId },
                ],
            })
            .select("_id")
            .lean();
        const transferIdList = transferIds.map((row) => row._id);
        if (transferIdList.length === 0) {
            return res.status(200).json({
                success: true,
                issues: [],
                totalCount: 0,
                page: 1,
                limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 10)),
                totalPages: 1,
            });
        }

        const filter = {
            transferRequest: { $in: transferIdList },
        };
        if (issueStatus && issueStatus !== "all") filter.issueStatus = issueStatus;
        if (issueType && issueType !== "all") filter.issueType = issueType;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const [rows, totalCount] = await Promise.all([
            TransferIssue.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate("variant", "sku")
                .populate("raisedById", "name")
                .populate({
                    path: "transferRequest",
                    select: "_id status fromType fromModel fromId toType toModel toId initiatedAt",
                    populate: [
                        { path: "fromId", select: "name" },
                        { path: "toId", select: "name" },
                    ],
                })
                .lean(),
            TransferIssue.countDocuments(filter),
        ]);

        const issues = await Promise.all(
            rows.map(async (row) => {
                const rawIssueImages = Array.isArray(row.issueImages) ? row.issueImages : [];
                const signedIssueImages = await Promise.all(
                    rawIssueImages.map(async (imgUrl) => {
                        const key = getKeyFromUrl(imgUrl);
                        if (!key) return imgUrl;
                        try {
                            return await getViewUrl(key);
                        } catch (_) {
                            return imgUrl;
                        }
                    })
                );

                return {
                    _id: row._id,
                    transferRequest: row.transferRequest?._id ?? null,
                    transferStatus: row.transferRequest?.status ?? null,
                    fromType: row.transferRequest?.fromType ?? null,
                    fromName: row.transferRequest?.fromId?.name ?? null,
                    toType: row.transferRequest?.toType ?? null,
                    toName: row.transferRequest?.toId?.name ?? null,
                    variant: row.variant?._id ?? row.variant ?? null,
                    sku: row.variant?.sku ?? null,
                    issueType: row.issueType,
                    issueQuantity: row.issueQuantity,
                    issueStatus: row.issueStatus,
                    issueDescription: row.issueDescription,
                    issueImages: signedIssueImages,
                    issueResolutionType: row.issueResolutionType ?? null,
                    issueResolutionDescription: row.issueResolutionDescription ?? null,
                    issueResolutionDate: row.issueResolutionDate ?? null,
                    raisedByType: row.raisedByType,
                    raisedByName: row.raisedById?.name ?? null,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt,
                };
            })
        );

        return res.status(200).json({
            success: true,
            issues,
            totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum) || 1,
        });
    } catch (error) {
        console.error("Get transfer issues error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getTransferIssueResolutionRules = async (req, res) => {
    try {
        const { issueType } = req.query;
        const normalizedIssueType =
            typeof issueType === "string" &&
            ["damaged", "missing", "extra"].includes(issueType)
                ? issueType
                : null;

        const allowedResolutionTypes = normalizedIssueType
            ? ISSUE_RESOLUTION_RULES[normalizedIssueType]
            : [];

        return res.status(200).json({
            success: true,
            issueType: normalizedIssueType,
            allowedResolutionTypes,
        });
    } catch (error) {
        console.error("Get transfer issue resolution rules error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const updateTransferIssueStatus = async (req, res) => {
    try {
        const {
            issueId,
            newStatus,
            userType,
            userId,
            issueResolutionType,
            issueResolutionDescription,
        } = req.body;

        if (!issueId || !mongoose.isValidObjectId(issueId)) {
            return res.status(400).json({
                success: false,
                message: "Valid issueId is required",
            });
        }
        if (
            !newStatus ||
            !["pending", "in_progress", "resolved"].includes(newStatus)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid newStatus is required",
            });
        }
        if (
            !userType ||
            !["vendor", "warehouse"].includes(userType) ||
            !userId ||
            !mongoose.isValidObjectId(userId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid userType and userId are required",
            });
        }

        const issue = await TransferIssue.findById(issueId);
        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Transfer issue not found",
            });
        }
        if (issue.issueStatus === "resolved") {
            return res.status(400).json({
                success: false,
                message: "Issue is already resolved",
            });
        }

        const transferRequest = await inventoryTransfer.findById(issue.transferRequest);
        if (!transferRequest) {
            return res.status(404).json({
                success: false,
                message: "Transfer request not found for this issue",
            });
        }

        const isSenderActor =
            transferRequest.fromType === userType &&
            String(transferRequest.fromId) === String(userId);
        const isReceiverActor =
            transferRequest.toType === userType &&
            String(transferRequest.toId) === String(userId);
        if (!isSenderActor && !isReceiverActor) {
            return res.status(403).json({
                success: false,
                message: "Actor does not belong to this transfer issue",
            });
        }

        // Ownership rules:
        // receiver: can set pending or resolved + set resolution type first time
        // sender: can only move to in_progress
        if (isReceiverActor && !["pending", "resolved"].includes(newStatus)) {
            return res.status(403).json({
                success: false,
                message: "Receiver can only set issue status to pending or resolved",
            });
        }
        if (isSenderActor && newStatus !== "in_progress") {
            return res.status(403).json({
                success: false,
                message: "Sender can only set issue status to in_progress",
            });
        }
        if (isSenderActor && newStatus === "in_progress" && !issue.issueResolutionType) {
            return res.status(400).json({
                success: false,
                message: "Receiver must select resolution type before sender marks in_progress",
            });
        }

        const allowedResolutions = ISSUE_RESOLUTION_RULES[issue.issueType] ?? [];
        if (
            isReceiverActor &&
            issueResolutionType !== undefined &&
            issueResolutionType !== null &&
            issueResolutionType !== ""
        ) {
            if (!allowedResolutions.includes(issueResolutionType)) {
                return res.status(400).json({
                    success: false,
                    message: `Valid resolution type is required for issue type ${issue.issueType}`,
                    allowedResolutionTypes: allowedResolutions,
                });
            }
            if (issue.issueResolutionType && issue.issueResolutionType !== issueResolutionType) {
                return res.status(400).json({
                    success: false,
                    message: "Resolution type is already selected and cannot be changed",
                });
            }
        }

        const effectiveResolutionType =
            isReceiverActor && newStatus === "resolved"
                ? (issue.issueResolutionType || issueResolutionType)
                : issueResolutionType;

        if (isReceiverActor && newStatus === "resolved") {
            if (!effectiveResolutionType || !allowedResolutions.includes(effectiveResolutionType)) {
                return res.status(400).json({
                    success: false,
                    message: "Receiver must set a valid resolution type before resolving",
                    allowedResolutionTypes: allowedResolutions,
                });
            }
        }

        const qty = Number(issue.issueQuantity || 0);
        if (qty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Issue quantity must be greater than 0",
            });
        }
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                if (newStatus === "resolved") {
                    const senderInventory = await getOrCreateInventory(
                        transferRequest.fromType,
                        transferRequest.fromId,
                        issue.variant,
                        session
                    );
                    const receiverInventory = await getOrCreateInventory(
                        transferRequest.toType,
                        transferRequest.toId,
                        issue.variant,
                        session
                    );

                    if (issue.issueType === "damaged") {
                        if (Number(receiverInventory.damagedQty ?? 0) < qty) {
                            throw new Error("Receiver damaged stock is insufficient for this resolution");
                        }
                        if (effectiveResolutionType === "return") {
                            if (Number(receiverInventory.quantity ?? 0) < qty) {
                                throw new Error("Receiver quantity is insufficient for damaged return");
                            }
                            receiverInventory.quantity = Number(receiverInventory.quantity ?? 0) - qty;
                            receiverInventory.damagedQty = Number(receiverInventory.damagedQty ?? 0) - qty;
                            senderInventory.quantity = Number(senderInventory.quantity ?? 0) + qty;
                            senderInventory.damagedQty = Number(senderInventory.damagedQty ?? 0) + qty;
                        } else if (effectiveResolutionType === "replace") {
                            if (Number(senderInventory.quantity ?? 0) < qty) {
                                throw new Error("Sender quantity is insufficient for damaged replacement");
                            }
                            senderInventory.quantity = Number(senderInventory.quantity ?? 0) - qty;
                            receiverInventory.quantity = Number(receiverInventory.quantity ?? 0) + qty;
                            receiverInventory.damagedQty = Number(receiverInventory.damagedQty ?? 0) - qty;
                        } else {
                            throw new Error("Invalid damaged resolution type");
                        }
                    } else if (issue.issueType === "missing") {
                        if (Number(senderInventory.missingHold ?? 0) < qty) {
                            throw new Error("Sender missing hold is insufficient for this resolution");
                        }
                        if (effectiveResolutionType === "replace") {
                            if (Number(senderInventory.quantity ?? 0) < qty) {
                                throw new Error("Sender quantity is insufficient for missing replacement");
                            }
                            senderInventory.missingHold = Number(senderInventory.missingHold ?? 0) - qty;
                            senderInventory.quantity = Number(senderInventory.quantity ?? 0) - qty;
                            receiverInventory.quantity = Number(receiverInventory.quantity ?? 0) + qty;
                        } else if (effectiveResolutionType === "adjust") {
                            senderInventory.missingHold = Number(senderInventory.missingHold ?? 0) - qty;
                        } else {
                            throw new Error("Invalid missing resolution type");
                        }
                    } else if (issue.issueType === "extra") {
                        if (Number(receiverInventory.extraHold ?? 0) < qty) {
                            throw new Error("Receiver extra hold is insufficient for this resolution");
                        }
                        if (effectiveResolutionType === "return") {
                            if (Number(receiverInventory.quantity ?? 0) < qty) {
                                throw new Error("Receiver quantity is insufficient for extra return");
                            }
                            receiverInventory.quantity = Number(receiverInventory.quantity ?? 0) - qty;
                            receiverInventory.extraHold = Number(receiverInventory.extraHold ?? 0) - qty;
                            senderInventory.quantity = Number(senderInventory.quantity ?? 0) + qty;
                        } else if (effectiveResolutionType === "adjust") {
                            receiverInventory.extraHold = Number(receiverInventory.extraHold ?? 0) - qty;
                        } else {
                            throw new Error("Invalid extra resolution type");
                        }
                    } else {
                        throw new Error("Unsupported issue type");
                    }

                    recomputeAvailable(senderInventory);
                    recomputeAvailable(receiverInventory);
                    await senderInventory.save({ session });
                    await receiverInventory.save({ session });
                }

                issue.issueStatus = newStatus;
                if (isReceiverActor && issueResolutionType && !issue.issueResolutionType) {
                    issue.issueResolutionType = issueResolutionType;
                }
                if (newStatus === "resolved") {
                    issue.issueResolutionDescription =
                        typeof issueResolutionDescription === "string"
                            ? issueResolutionDescription
                            : "";
                    issue.issueResolutionDate = new Date();
                    issue.issueResolvedByType = userType === "vendor" ? "Vendor" : "Warehouse";
                    issue.issueResolvedById = userId;
                }
                await issue.save({ session });

                if (newStatus === "resolved") {
                    const pendingCount = await TransferIssue.countDocuments({
                        transferRequest: issue.transferRequest,
                        issueStatus: { $ne: "resolved" },
                    }).session(session);

                    if (pendingCount === 0) {
                        transferRequest.status = "completed";
                        transferRequest.completedAt = new Date();
                        await transferRequest.save({ session });

                        const changedByModel = userType === "vendor" ? "Vendor" : "Warehouse";
                        await TransferStatusHistory.create(
                            [
                                {
                                    transferRequest: transferRequest._id,
                                    status: "completed",
                                    changedAt: new Date(),
                                    changedByType: userType,
                                    changedByModel,
                                    changedById: userId,
                                },
                            ],
                            { session }
                        );
                    }
                }
            });
        } finally {
            session.endSession();
        }

        return res.status(200).json({
            success: true,
            message: "Transfer issue updated successfully",
            issue,
        });
    } catch (error) {
        console.error("Update transfer issue status error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

const updateTransferStatus = async (req, res) => {

    try {
        const { transferId, newStatus, userType, userId } = req.body;
        if (!transferId || !mongoose.isValidObjectId(transferId)) {
            return res.status(400).json({
                success: false,
                message: "Valid transfer id is required",
            });
        }
        if (
            !newStatus ||
            !userType ||
            !userId ||
            !mongoose.isValidObjectId(userId) ||
            !["vendor", "warehouse"].includes(userType)
        ) {
            return res.status(400).json({
                success: false,
                message: "newStatus, userType and userId are required",
            });
        }

        const transferRequest = await inventoryTransfer.findById(transferId);

        if (!transferRequest) {
            return res.status(404).json({
                success: false,
                message: "Transfer request not found",
            });
        }

        const isFromActor =
            transferRequest.fromType === userType &&
            String(transferRequest.fromId) === String(userId);
        const isToActor =
            transferRequest.toType === userType &&
            String(transferRequest.toId) === String(userId);

        if (!isFromActor && !isToActor) {
            return res.status(403).json({
                success: false,
                message: "Actor does not belong to this transfer",
            });
        }

        const allowedStatuses =
            statusRules[transferRequest.status]?.[userType]?.can ?? [];
        if (!allowedStatuses.includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                if (newStatus === "shipped") {
                    for (const item of transferRequest.items) {
                        const qty = Number(item.quantity) || 0;
                        const senderFilter =
                            transferRequest.fromType === "warehouse"
                                ? { variant: item.variant, warehouse: transferRequest.fromId }
                                : { variant: item.variant, vendor: transferRequest.fromId };

                        const senderInventory = await Inventory.findOne(senderFilter).session(session);
                        if (!senderInventory) {
                            throw new Error("Sender inventory not found");
                        }

                        const available = Number(senderInventory.available ?? 0);
                        if (available < qty) {
                            throw new Error("Insufficient available stock to ship");
                        }

                        senderInventory.reserved = Number(senderInventory.reserved ?? 0) + qty;
                        recomputeAvailable(senderInventory);
                        await senderInventory.save({ session });
                    }
                }

                transferRequest.status = newStatus;
                const statusDateField = `${newStatus}At`;
                if (statusDateField in transferRequest) {
                    transferRequest[statusDateField] = new Date();
                }
                await transferRequest.save({ session });

                const changedByModel = userType === "vendor" ? "Vendor" : "Warehouse";
                await TransferStatusHistory.create(
                    [
                        {
                            transferRequest: transferRequest._id,
                            status: newStatus,
                            changedAt: new Date(),
                            changedByType: userType,
                            changedByModel,
                            changedById: userId,
                        },
                    ],
                    { session }
                );
            });
        } finally {
            session.endSession();
        }

        return res.status(200).json({
            success: true,
            message: "Transfer request status updated successfully",
            transferRequest,
        });

    } catch (error) {
        console.error("Update inventory transfer request status error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

const completeTransfer = async (req, res) => {
    try {
        const { transferId, userType, userId } = req.body;
        if (!transferId || !mongoose.isValidObjectId(transferId)) {
            return res.status(400).json({
                success: false,
                message: "Valid transfer id is required",
            });
        }
        if (
            !userType ||
            !userId ||
            !mongoose.isValidObjectId(userId) ||
            !["vendor", "warehouse"].includes(userType)
        ) {
            return res.status(400).json({
                success: false,
                message: "userType and userId are required",
            });
        }

        const transferRequest = await inventoryTransfer.findById(transferId);
        if (!transferRequest) {
            return res.status(404).json({
                success: false,
                message: "Transfer request not found",
            });
        }

        const isReceiverActor =
            transferRequest.toType === userType &&
            String(transferRequest.toId) === String(userId);
        if (!isReceiverActor) {
            return res.status(403).json({
                success: false,
                message: "Only receiver can complete this transfer",
            });
        }

        if (transferRequest.status !== "delivered") {
            return res.status(400).json({
                success: false,
                message: "Only delivered transfer can be completed",
            });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                for (const item of transferRequest.items) {
                    const qty = Number(item.quantity) || 0;
                    const senderFilter =
                        transferRequest.fromType === "warehouse"
                            ? { variant: item.variant, warehouse: transferRequest.fromId }
                            : { variant: item.variant, vendor: transferRequest.fromId };
                    const receiverFilter =
                        transferRequest.toType === "warehouse"
                            ? { variant: item.variant, warehouse: transferRequest.toId }
                            : { variant: item.variant, vendor: transferRequest.toId };

                    const senderInventory = await Inventory.findOne(senderFilter).session(session);
                    if (!senderInventory) {
                        throw new Error("Sender inventory not found");
                    }
                    await ensureSenderReservedQty(senderInventory, qty, session);
                    const reserved = Number(senderInventory.reserved ?? 0);
                    if (reserved < qty) {
                        throw new Error("Reserved stock is less than transfer quantity");
                    }
                    if (Number(senderInventory.quantity ?? 0) < qty) {
                        throw new Error("Sender quantity is less than transfer quantity");
                    }

                    senderInventory.quantity = Number(senderInventory.quantity ?? 0) - qty;
                    senderInventory.reserved = Math.max(0, reserved - qty);
                    recomputeAvailable(senderInventory);
                    await senderInventory.save({ session });

                    let receiverInventory = await Inventory.findOne(receiverFilter).session(session);
                    if (!receiverInventory) {
                        receiverInventory = await Inventory.create(
                            [
                                {
                                    variant: item.variant,
                                    warehouse: transferRequest.toType === "warehouse" ? transferRequest.toId : null,
                                    vendor: transferRequest.toType === "vendor" ? transferRequest.toId : null,
                                    quantity: 0,
                                    reserved: 0,
                                    available: 0,
                                    missingHold: 0,
                                    damagedQty: 0,
                                    extraHold: 0,
                                    locationType: transferRequest.toType,
                                },
                            ],
                            { session }
                        ).then((docs) => docs[0]);
                    }

                    receiverInventory.quantity = Number(receiverInventory.quantity ?? 0) + qty;
                    recomputeAvailable(receiverInventory);
                    await receiverInventory.save({ session });
                }

                transferRequest.items = transferRequest.items.map((item) => ({
                    ...item.toObject(),
                    receivedQuantity: Number(item.quantity),
                    acceptedQuantity: Number(item.quantity),
                    damagedQuantity: 0,
                    missingQuantity: 0,
                    extraQuantity: 0,
                }));
                transferRequest.status = "completed";
                transferRequest.completedAt = new Date();
                await transferRequest.save({ session });

                const changedByModel = userType === "vendor" ? "Vendor" : "Warehouse";
                await TransferStatusHistory.create(
                    [
                        {
                            transferRequest: transferRequest._id,
                            status: "completed",
                            changedAt: new Date(),
                            changedByType: userType,
                            changedByModel,
                            changedById: userId,
                        },
                    ],
                    { session }
                );
            });
        } finally {
            session.endSession();
        }

        return res.status(200).json({
            success: true,
            message: "Transfer completed successfully",
            transferRequest,
        });
    } catch (error) {
        console.error("Complete transfer error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

const createIssueReportedTransfer = async (req, res) => {
    try {
        const { transferId, userType, userId, items } = req.body;
        if (!transferId || !mongoose.isValidObjectId(transferId)) {
            return res.status(400).json({
                success: false,
                message: "Valid transfer id is required",
            });
        }
        if (
            !userType ||
            !userId ||
            !mongoose.isValidObjectId(userId) ||
            !["vendor", "warehouse"].includes(userType)
        ) {
            return res.status(400).json({
                success: false,
                message: "userType and userId are required",
            });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items are required",
            });
        }

        const transferRequest = await inventoryTransfer.findById(transferId);
        if (!transferRequest) {
            return res.status(404).json({
                success: false,
                message: "Transfer request not found",
            });
        }
        if (transferRequest.status !== "delivered") {
            return res.status(400).json({
                success: false,
                message: "Only delivered transfer can be marked as issue_reported",
            });
        }

        const isReceiverActor =
            transferRequest.toType === userType &&
            String(transferRequest.toId) === String(userId);
        if (!isReceiverActor) {
            return res.status(403).json({
                success: false,
                message: "Only receiver can report issues",
            });
        }

        const transferItemMap = new Map(
            transferRequest.items.map((row) => [String(row.variant), Number(row.quantity)])
        );
        if (items.length !== transferRequest.items.length) {
            return res.status(400).json({
                success: false,
                message: "All transfer variants must be provided in items",
            });
        }

        let hasAnyIssue = false;
        for (const row of items) {
            if (!row?.variant || !transferItemMap.has(String(row.variant))) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid variant in items",
                });
            }
            const sent = transferItemMap.get(String(row.variant)) || 0;
            const received = Number(row.receivedQuantity);
            const accepted = Number(row.acceptedQuantity);
            const damaged = Number(row.damagedQuantity || 0);
            const missing = Number(row.missingQuantity || 0);
            const extra = Number(row.extraQuantity || 0);

            if (
                [received, accepted, damaged, missing, extra].some(
                    (n) => !Number.isInteger(n) || n < 0
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "All quantities must be non-negative integers",
                });
            }

            if (received !== accepted + damaged) {
                return res.status(400).json({
                    success: false,
                    message: "received must equal accepted + damaged for each variant",
                });
            }
            if (received !== sent - missing + extra) {
                return res.status(400).json({
                    success: false,
                    message: "received must equal sent - missing + extra for each variant",
                });
            }
            if (damaged > 0 || missing > 0 || extra > 0) {
                hasAnyIssue = true;
            }
        }

        if (!hasAnyIssue) {
            return res.status(400).json({
                success: false,
                message: "No issue found. Use complete endpoint for perfect settlement.",
            });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                for (const row of items) {
                    const variantId = row.variant;
                    const lineQty = transferItemMap.get(String(variantId)) || 0;
                    const acceptedQty = Number(row.acceptedQuantity || 0);
                    const damagedQty = Number(row.damagedQuantity || 0);
                    const missingQty = Number(row.missingQuantity || 0);
                    const extraQty = Number(row.extraQuantity || 0);
                    const issueImages = Array.isArray(row.issueImages) ? row.issueImages : [];
                    /** Units that left sender physically (= received at warehouse) */
                    const receivedQty = acceptedQty + damagedQty;

                    const senderFilter =
                        transferRequest.fromType === "warehouse"
                            ? { variant: variantId, warehouse: transferRequest.fromId }
                            : { variant: variantId, vendor: transferRequest.fromId };
                    const receiverFilter =
                        transferRequest.toType === "warehouse"
                            ? { variant: variantId, warehouse: transferRequest.toId }
                            : { variant: variantId, vendor: transferRequest.toId };

                    const senderInventory = await Inventory.findOne(senderFilter).session(session);
                    if (!senderInventory) {
                        throw new Error("Sender inventory not found");
                    }
                    await ensureSenderReservedQty(senderInventory, lineQty, session);
                    if (Number(senderInventory.reserved ?? 0) < lineQty) {
                        throw new Error("Transfer line exceeds reserved stock on sender");
                    }
                    if (Number(senderInventory.quantity ?? 0) < receivedQty) {
                        throw new Error("Sender quantity is insufficient for this settlement line");
                    }

                    senderInventory.quantity = Number(senderInventory.quantity ?? 0) - receivedQty;
                    senderInventory.reserved = Math.max(
                        0,
                        Number(senderInventory.reserved ?? 0) - lineQty
                    );
                    senderInventory.missingHold = Number(senderInventory.missingHold ?? 0) + missingQty;
                    recomputeAvailable(senderInventory);
                    await senderInventory.save({ session });

                    let receiverInventory = await Inventory.findOne(receiverFilter).session(session);
                    if (!receiverInventory) {
                        receiverInventory = await Inventory.create(
                            [
                                {
                                    variant: variantId,
                                    warehouse: transferRequest.toType === "warehouse" ? transferRequest.toId : null,
                                    vendor: transferRequest.toType === "vendor" ? transferRequest.toId : null,
                                    quantity: 0,
                                    reserved: 0,
                                    available: 0,
                                    missingHold: 0,
                                    damagedQty: 0,
                                    extraHold: 0,
                                    locationType: transferRequest.toType,
                                },
                            ],
                            { session }
                        ).then((docs) => docs[0]);
                    }

                    receiverInventory.quantity =
                        Number(receiverInventory.quantity ?? 0) + acceptedQty + damagedQty + extraQty;
                    receiverInventory.damagedQty = Number(receiverInventory.damagedQty ?? 0) + damagedQty;
                    receiverInventory.extraHold = Number(receiverInventory.extraHold ?? 0) + extraQty;
                    recomputeAvailable(receiverInventory);
                    await receiverInventory.save({ session });

                    const raisedByModel = userType === "vendor" ? "Vendor" : "Warehouse";
                    const issueDocs = [];
                    if (damagedQty > 0) {
                        issueDocs.push({
                            transfer: transferRequest._id,
                            transferRequest: transferRequest._id,
                            variant: variantId,
                            inventoryItem: receiverInventory._id,
                            issueType: "damaged",
                            issueDescription: "Damaged quantity reported during transfer receive",
                            issueImages,
                            issueQuantity: damagedQty,
                            raisedByType: userType,
                            raisedByModel,
                            raisedById: userId,
                        });
                    }
                    if (missingQty > 0) {
                        issueDocs.push({
                            transfer: transferRequest._id,
                            transferRequest: transferRequest._id,
                            variant: variantId,
                            inventoryItem: senderInventory._id,
                            issueType: "missing",
                            issueDescription: "Missing quantity reported during transfer receive",
                            issueQuantity: missingQty,
                            raisedByType: userType,
                            raisedByModel,
                            raisedById: userId,
                        });
                    }
                    if (extraQty > 0) {
                        issueDocs.push({
                            transfer: transferRequest._id,
                            transferRequest: transferRequest._id,
                            variant: variantId,
                            inventoryItem: receiverInventory._id,
                            issueType: "extra",
                            issueDescription: "Extra quantity reported during transfer receive",
                            issueQuantity: extraQty,
                            raisedByType: userType,
                            raisedByModel,
                            raisedById: userId,
                        });
                    }

                    if (issueDocs.length > 0) {
                        await TransferIssue.insertMany(issueDocs, { session, ordered: true });
                    }
                }

                const itemPayloadMap = new Map(items.map((row) => [String(row.variant), row]));
                transferRequest.items = transferRequest.items.map((item) => {
                    const row = itemPayloadMap.get(String(item.variant));
                    return {
                        ...item.toObject(),
                        receivedQuantity: Number(row.receivedQuantity),
                        acceptedQuantity: Number(row.acceptedQuantity),
                        damagedQuantity: Number(row.damagedQuantity || 0),
                        missingQuantity: Number(row.missingQuantity || 0),
                        extraQuantity: Number(row.extraQuantity || 0),
                    };
                });

                transferRequest.status = "issue_reported";
                await transferRequest.save({ session });

                const changedByModel = userType === "vendor" ? "Vendor" : "Warehouse";
                await TransferStatusHistory.create(
                    [
                        {
                            transferRequest: transferRequest._id,
                            status: "issue_reported",
                            changedAt: new Date(),
                            changedByType: userType,
                            changedByModel,
                            changedById: userId,
                        },
                    ],
                    { session }
                );
            });
        } finally {
            session.endSession();
        }

        return res.status(200).json({
            success: true,
            message: "Transfer marked issue_reported and issues created successfully",
            transferRequest,
        });
    } catch (error) {
        console.error("Create issue reported transfer error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

export {
    createInventoryTransferRequest,
    getInventoryTransferRequests,
    getInventoryTransferRequestById,
    getInventoryTransferStatusRules,
    getTransferIssues,
    getTransferIssueResolutionRules,
    updateTransferIssueStatus,
    updateTransferStatus,
    completeTransfer,
    createIssueReportedTransfer,
};
