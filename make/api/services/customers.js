import Customer from "../models/Customer.js";

export async function getCustomer(id) {
  try {
    const customerDetails = await Customer.findById(id);
    
    if (!customerDetails) {
      throw new Error(`Customer with id ${id} not found`);
    }

    return customerDetails;
  } catch (error) {
    console.error("Error obteniendo customer:", error);
    return error; // 🔥 NUNCA return error
  }
}
