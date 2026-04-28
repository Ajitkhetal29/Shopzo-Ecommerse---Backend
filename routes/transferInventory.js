import express from "express";
import {
  createInventoryTransferRequest,
  getInventoryTransferRequests,
  getInventoryTransferRequestById,
  getInventoryTransferStatusRules,
  getTransferIssues,
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
inventoryTransferRouter.patch("/status", updateTransferStatus);
inventoryTransferRouter.patch("/complete", completeTransfer);
inventoryTransferRouter.patch("/issue-report", createIssueReportedTransfer);

export default inventoryTransferRouter;
