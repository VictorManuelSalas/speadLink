import { formatExcelCustomers } from "../utils/formatJson.js";
import { response } from "../utils/response.js";
import Customer from "../models/Customer.js";

const getAllCustomers = async (req, res) => {
  try {
    const { array: details } = req.body;
    console.log(details);
    if (!details || details.length === 0) {
      return response(
        res,
        400,
        "No se proporcionaron detalles de clientes",
        "error"
      );
    }
    const formattedData = formatExcelCustomers(details);

    return response(res, 200, formattedData, "success");
  } catch (error) {
    console.log(error);
    return response(res, 500, error, "error");
  }
};

const createDBCustomers = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);

    return response(res, 201, customer, "success");
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getDBCustomers = async (req, res) => {
  try {
    const customers = await Customer.find();

    return response(res, 200, customers, "success");
  } catch (error) {
    res.status(400).json({ error: err.message });
  }
};

export { getAllCustomers, getDBCustomers, createDBCustomers };
