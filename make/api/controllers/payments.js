import { formatExcelRows } from "../utils/formatJson.js";
import { response } from "../utils/response.js";
import {
  generarFacturaPDF,
  createInvoiceInDB,
  updateInvoiceInDB,
  getAllInvoices,
   
  deleteInvoice
} from "../services/payments.js";

const createMonthPayment = async (req, res) => {
  try {
    const { array: details } = req.body;
    console.log(details);
    if (!details || details.length === 0) {
      return response(
        res,
        400,
        "No se proporcionaron detalles de pago",
        "error"
      );
    }
    const formattedData = formatExcelRows(details);

    //Introduce the new invoices into the database
    for (const invoice of formattedData) {
      if (invoice.dbId) {
        const { _id = null } = await createInvoiceInDB(invoice);
        console.log("Invoice created:", _id);
        invoice["invoiceId"] = _id;
      } else {
        invoice["invoiceId"] = "";
        console.log("No dbId provided, skipping invoice creation.");
      }
    }

    return response(res, 200, formattedData, "success");
  } catch (error) {
    console.log(error);
    return response(res, 500, error, "error");
  }
};

const createInvoice = async (req, res) => {
  try {
    const details = req.body;

    if (!details.dbId) {
      return res.status(400).send("Customer ID is required");
    }
    console.log(details);
    const { _id = null } = await createInvoiceInDB(details);
    console.log("Invoice created:", _id);

    return response(res, 200, { _id }, "success");
  } catch (error) {
    console.error("Error generando invoice:", error);
    res.status(500).send("Error invoice PDF");
  }
};

const createPaymentPDF = async (req, res) => {
  try {
    const { invoice_id } = req.query;

    if (!invoice_id) {
      return res.status(400).send("Invoice ID is required");
    }

    const { pdf } = await generarFacturaPDF(invoice_id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=factura.pdf");
    res.send(pdf);
  } catch (error) {
    console.error("Error generando PDF:", error);
    res.status(500).send("Error generando PDF");
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id: invoiceId } = req.params;
    const payload = req.body;
    if (!invoiceId) {
      throw new Error("Id is required");
    }
    console.log(invoiceId, payload);
    const { _id = null } = await updateInvoiceInDB(invoiceId, payload);
    console.log("Invoice updated:", _id);

    return response(res, 200, { invoiceId: _id }, "success");
  } catch (error) {
    console.log(error);
    return response(res, 500, error, "error");
  }
};

const deletePayment = async (req, res) => {
 try {
     const invoice = await deleteInvoice(req.params.id);

     if (!invoice) {
       return response(res, 404, "Factura no encontrada", "error");
     }

     return response(res, 200, { deleted: invoice && true }, "success");
   } catch (error) {
     res.status(400).json({ error: err.message });
   }
};
const getAllInvoice = async (req, res) => {
  try {
    const { clientId } = req.params;

    const invoices = await getAllInvoices(clientId);

    return response(res, 200, invoices, "success");
  } catch (error) {
    console.error("Error obteniendo facturas:", error);
    res.status(500).send("Error obteniendo facturas");
  }
};

export {
  createPaymentPDF,
  createMonthPayment,
  updatePaymentStatus,
  createInvoice,
  getAllInvoice,
  deletePayment,
};
