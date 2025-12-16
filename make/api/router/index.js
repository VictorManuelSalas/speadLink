import { Router } from "express";
import payments from "./payments.js";
import customers from "./customers.js";

const routerApi = (app) => {
  const router =  Router();
  app.use("/api/v1", router);
  router.use("/payments", payments);
  router.use("/customers", customers);
};

export default routerApi;
