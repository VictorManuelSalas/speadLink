// Obtener clientId desde la URL
// const API_URL = "http://localhost:3000/api/v1";
const API_URL = "https://make-gold.vercel.app/api/v1";

const params = new URLSearchParams(window.location.search);
const clientId = params.get("clientId");
async function getCustomerData() {
  const clientInfo = document.getElementById("client-info");
  const error = document.getElementById("error");

  if (!clientId) {
    error.textContent = "❌ No se proporcionó un ID de cliente.";
    throw new Error("Client ID missing");
  }

  try {
    const res = await fetch(`${API_URL}/customers/db`);
    const customers = await res.json();

    const [customerDetails] = customers.data.filter(
      (customer) => customer._id == clientId
    );
    console.log("customer", customerDetails);
    clientInfo.innerHTML = `
     <h3>👤 ${customerDetails.name}</h3>
    <div class="plan">📦 Plan: <strong>${customerDetails.plan}</strong> · ${
      customerDetails.megas
    }mbts</div>

    <div class="info">
      <span>📧 ${customerDetails.email || "Sin correo"}</span>
      <span>📞 ${customerDetails.phone || "—"}</span>
    </div> 
    `;
  } catch (err) {
    list.innerHTML = "Error cargando clientes";
  }
}

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const getMonth = (number) => {
  const currentDate = new Date(`${number.split("-")[1]}-01-2026`);
  return months[currentDate.getMonth()];
};
async function getInvoices() {
  const table = document.getElementById("invoicesTable");

  table.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  let url = `${API_URL}/payments/${clientId}`;

  console.log(url);
  try {
    const res = await fetch(url);
    const invoices = await res.json();

    table.innerHTML = "";

    if (invoices.data.length === 0) {
      table.innerHTML = `<tr><td colspan="5">No hay facturas</td></tr>`;
      return;
    }

    invoices.data.forEach((inv) => {
      let statusClass = "";

      if (inv.status === "Pagado") statusClass = "status-green";
      else if (inv.status === "Processed") statusClass = "status-yellow";
      else if (inv.status === "Canceled") statusClass = "status-gray";
      const limitDate = inv.dueDate.split("T")[0];
      table.innerHTML += `
        <tr>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.customerId?.name || "—"}</td>
         <td><b class="${statusClass} status">${
        inv.status == "Processed" ? "Pendiente" : inv.status
      }</b></td>
          <td>${getMonth(inv.issueDate)}</td>
          <td>${limitDate}</td>
          <td>$${inv.total} ${inv.currency}</td>
          <td>
            <button onclick="downloadPDF('${inv._id}')">PDF</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="5">Error cargando facturas</td></tr>`;
  }
}

// ---------- PDF ----------
function downloadPDF(invoiceId) {
  window.open(`${API_URL}/payments/pdf?invoice_id=${invoiceId}`, "_blank");
}

function goToSecurePage() {
  const codigoCorrecto = "19080545vmnS."; // ← CAMBIA ESTE CÓDIGO

  const codigo = prompt("Ingresa la contraseña de acceso:");

  if (codigo === null) return; // canceló

  if (codigo == codigoCorrecto) {
    window.location.href = "./admin/index.html"; // página destino
  } else {
    alert("❌ Contraseña incorrecta");
  }
}

getCustomerData();
getInvoices();
