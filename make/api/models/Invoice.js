import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    // 🔗 Relación con cliente
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // 🧾 Folio de factura
    invoiceNumber: {
      type: String,
      unique: true,
    },

    // 🔄 Estados de la factura
    status: {
      type: String,
      enum: ["Draft", "Agendado", "Processed", "Pagado", "Canceled"],
      default: "Draft",
      index: true,
    },

    // 💱 Moneda
    currency: {
      type: String,
      default: "MXN",
    },

    // 📦 Conceptos
    items: [
      {
        description: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
        },
        total: {
          type: Number,
          required: true,
        },
      },
    ],

    // 💰 Totales
    subtotal: {
      type: Number,
    },

    tax: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
    },

    // 📆 Fechas
    issueDate: {
      type: Date,
      default: Date.now,
    },

    dueDate: {
      type: Date,
      required: false,
    },
    installationDate: {
      type: String,
      required: true,
    },

    paidDate: {
      type: Date,
    },

    // 📎 PDF
    pdfUrl: {
      type: String,
    },

    // 📝 Notas
    notes: String,

    // 👤 Auditoría
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
  },
  {
    timestamps: true,
  }
);
invoiceSchema.pre("save", function () {
  // Generar invoiceNumber
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    this.invoiceNumber = `INV-${year}-${random}`;
  }

  // Totales
  if (this.items?.length) {
    this.subtotal = this.items.reduce(
      (acc, item) => acc + item.total,
      0
    );

    this.total = this.subtotal + (this.tax || 0);
  }

  // Pagado
  if (this.status === "Pagado" && !this.paidDate) {
    this.paidDate = new Date();
  }

  // DueDate = instalación + 2 días
  if (this.installationDate && !this.dueDate) {
    const [day, month, year] = this.installationDate.split("-");

    const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    date.setDate(date.getDate() + 2);

    this.dueDate = date;
  }
});

export default mongoose.model("Invoice", invoiceSchema);
