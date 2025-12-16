import { Router } from "express";
import {
  createMonthPayment,
  createPaymentPDF,
  updatePaymentStatus,getAllInvoice,createInvoice
} from "../controllers/payments.js";

const router = Router();

//Rutas
router.post("/", createInvoice);
router.post("/month", createMonthPayment);
router.put("/:id", updatePaymentStatus);
router.post("/pdf", createPaymentPDF);
router.get("/pdf", createPaymentPDF);
router.get("/:clientId", getAllInvoice);
router.get("/", getAllInvoice);

export default router;
