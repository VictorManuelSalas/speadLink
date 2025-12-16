import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { getCustomer } from "./customers.js";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import { plans } from "../utils/currentPrices.js";
export async function generarFacturaPDF(id) {
  let browser;

  try {
    const invoiceDetails = await Invoice.findById(id)
      .populate("customerId")
      .lean(); // 🔥 recomendado

    if (!invoiceDetails) {
      throw new Error("Invoice not found");
    }

    const html = recreateHTML(invoiceDetails);
    console.log("HTML length:", html.length);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMediaType("screen");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    console.log("PDF buffer length:", pdfBuffer.length);

    return {
      pdf: pdfBuffer,
      client: invoiceDetails.customerId?.name || "Cliente",
      paymentDate: invoiceDetails.paidDate,
    };
  } catch (error) {
    console.error("Error generando PDF:", error);
    throw error; // 🔥 NUNCA return error
  } finally {
    if (browser) await browser.close();
  }
}

const recreateHTML = (data) => {
  try {
    const {
      createdAt,
      paidDate,
      dueDate,
      invoiceNumber,
      status,
      subtotal,
      currency,
      tax,
      total,
      items,
      customerId: { name: clientName, email: clientCorreo, phone: clientPhone },
    } = data;

    const formatDate = (date) =>
      date ? new Date(date).toLocaleDateString("es-MX") : "—";

    const itemsHTML = items
      .map(
        (item) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unitPrice} ${currency}</td>
            <td>${item.total} ${currency}</td>
          </tr>
        `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Factura INV-2025-34094</title>

    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        background: #fff;
        padding: 40px;
        color: #333;
      }

      .invoice {
        max-width: 800px;
        margin: auto;
        background: #fff;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
      }

      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .companyContactData {
        font-size: 13px;
      }
      .status {
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: bold;
         background: ${status === "Pagado" ? "#d4edda" : "#fff3cd"};
      color: ${status === "Pagado" ? "#155724" : "#856404"};
      }

      .info {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }

      .info div {
        font-size: 14px;
      }

      .info strong {
        display: block;
        color: #555;
        margin-bottom: 4px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }

      table thead {
        background: #f0f2f5;
      }

      table th,
      table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
      }

      table th {
        font-weight: bold;
      }

      .totals {
        display: flex;
        justify-content: flex-end;
      }

      .totals table {
        width: 300px;
      }

      .totals td {
        padding: 8px 12px;
      }

      .totals tr:last-child td {
        font-size: 16px;
        font-weight: bold;
        border-top: 2px solid #333;
      }

      .footer {
        margin-top: 40px;
        text-align: center;
        font-size: 13px;
        color: #777;
      }
    </style>
  </head>

  <body>
    <div class="invoice">
      <!-- Header -->
      <div class="header">
        <div class="logo">
          <svg
            width="250"
            height="80"
            viewBox="0 0 400 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="Wifi_Icon">
              <path
                d="M70 10C70 4.47715 65.5228 0 60 0H20C8.95431 0 0 8.95431 0 20V50C0 61.0457 8.95431 70 20 70H60C65.5228 70 70 65.5228 70 60V10Z"
                fill="#1C3879"
              />

              <circle cx="35" cy="45" r="3" fill="white" />
              <path
                d="M35 40C38.3137 40 41 37.3137 41 34C41 30.6863 38.3137 28 35 28C31.6863 28 29 30.6863 29 34C29 37.3137 31.6863 40 35 40Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M35 24C42.732 24 49 17.732 49 10H46C46 16.0751 40.0751 21 35 21C29.9249 21 24 16.0751 24 10H21C21 17.732 27.268 24 35 24Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M35 8C48.8071 8 60 19.1929 60 33H57C57 20.8497 47.1503 11 35 11C22.8497 11 13 20.8497 13 33H10C10 19.1929 21.1929 8 35 8Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>

            <text
              x="90"
              y="55"
              font-family="Arial, Helvetica, sans-serif"
              font-size="55"
              font-weight="bold"
              fill="#333333"
            >
              SpeedLink
            </text>
          </svg>
        </div>
        <div>
          <h1>Factura</h1>
          <p><strong>No:</strong> ${invoiceNumber}</p>
          <p class="companyContactData">
            <strong>Correo:</strong> speadinternetmd@gmail.com
          </p>
          <p class="companyContactData"><strong>Tel:</strong> +52 8716156932</p>
          <span class="status">${status}</span>
        </div>
      </div>

      <!-- Info -->

      <div class="info">
        <div>
          <h3>Cliente</h3><hr />
          <p><strong>Nombre:</strong> ${clientName}</p>
          <p><strong>Tel:</strong> ${clientPhone || null}</p>
          <p><strong>Correo:</strong> ${clientCorreo}</p>
        </div>

        <div>
          <h3>Fechas</h3><hr />
          <p><strong>Fecha de emisión</strong> ${formatDate(createdAt)}</p>
          <p><strong>Fecha de pago</strong> ${formatDate(paidDate)}</p>
          <p><strong>Fecha límite de pago</strong> ${formatDate(dueDate)}</p>
        </div>
      </div>

      <!-- Items -->
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio Unitario</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal</td>
            <td>$ ${subtotal} ${currency}</td>
          </tr>
          <tr>
            <td>Impuestos</td>
            <td>$ ${tax} ${currency}</td>
          </tr>
          <tr>
            <td>Total</td>
            <td>$ ${total} ${currency}</td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div class="footer">
        Gracias por su preferencia.<br />
        Moneda: ${currency}
      </div>
    </div>
  </body>
</html>

  `;
  } catch (error) {
    console.error("Error recreando HTML:", error);
  }
};

export async function createInvoiceInDB({ dbId, dia_instalacion }) {
  try {
    console.log("Iniciando Creacion");
    if (!dbId) {
      throw new Error("The id is not incluided");
    }
    const customerDetails = await getCustomer(dbId);
    console.log(customerDetails);
    const { plan, megas, services, _id: customerId } = customerDetails;

    const itemsServcies = services.map(({ name, price }) => ({
      description: `${name}`,
      quantity: 1,
      unitPrice: price,
      total: price * 1,
    }));

    const newInvoice = new Invoice({
      customerId,
      status: "Processed",
      dueDate: null,
      items: [
        {
          description: `Servicio de Internet - Plan: ${plan}, Megas: ${megas}`,
          quantity: 1,
          unitPrice: plans[plan],
          total: plans[plan] * 1,
        },
        ...itemsServcies,
      ],
      installationDate: dia_instalacion,
    });
    const savedInvoice = await newInvoice.save();
    console.log(savedInvoice);
    return savedInvoice;
  } catch (error) {
    throw error;
  }
}
export async function updateInvoiceInDB(id, payload) {
  try {
    if (!id) throw new Error("Invoice ID is required");

    const invoice = await Invoice.findById(id);
    if (!invoice) throw new Error("Invoice not found");

    // Actualiza solo campos permitidos
    Object.assign(invoice, payload);

    await invoice.save(); // 🔥 ejecuta pre("save")

    return invoice;
  } catch (error) {
    return error;
  }
}

export async function getAllInvoices(clientId) {
  try {
    if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
      return []; // 👈 justo lo que quieres
    }

    const query = clientId ? { customerId: clientId } : {};

    const invoices = await Invoice.find(query)
      .populate("customerId", "name email phone")
      .sort({ createdAt: -1 });

    return invoices ?? [];
  } catch (error) {
    console.error("Error en getAllInvoices:", error);
    throw error;
  }
}
