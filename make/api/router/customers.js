import { Router } from "express";
import {
  getAllCustomers, createDBCustomers, getDBCustomers,deleteCustomer,updateDBCustomers
} from "../controllers/customers.js";

const router = Router();

//Rutas
router.get("/", getAllCustomers);
router.post("/", createDBCustomers);
router.put("/:id", updateDBCustomers);
router.get("/db", getDBCustomers);
router.delete("/:id", deleteCustomer);


export default router;
