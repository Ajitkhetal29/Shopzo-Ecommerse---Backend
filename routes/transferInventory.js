import express from "express";
import {
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
} from "../controllers/inventoryTransfer.js";

const inventoryTransferRouter = express.Router();

inventoryTransferRouter.post("/create", createInventoryTransferRequest);
inventoryTransferRouter.get("/list", getInventoryTransferRequests);
inventoryTransferRouter.get("/getById", getInventoryTransferRequestById);
inventoryTransferRouter.get("/status-rules", getInventoryTransferStatusRules);
inventoryTransferRouter.get("/issues", getTransferIssues);
inventoryTransferRouter.get("/issue-resolution-rules", getTransferIssueResolutionRules);
inventoryTransferRouter.patch("/issues/status", updateTransferIssueStatus);
inventoryTransferRouter.patch("/status", updateTransferStatus);
inventoryTransferRouter.patch("/complete", completeTransfer);
inventoryTransferRouter.patch("/issue-report", createIssueReportedTransfer);

export default inventoryTransferRouter;
