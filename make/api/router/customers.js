import { Router } from "express";
import {
  getAllCustomers, createDBCustomers, getDBCustomers
} from "../controllers/customers.js";

const router = Router();

//Rutas
router.get("/", getAllCustomers);
router.post("/", createDBCustomers);
router.get("/db", getDBCustomers);


export default router;
