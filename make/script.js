const API_URL = "http://localhost:3000/api/v1";

// ---------- CLIENTES ----------
const currentCustomers = [];
async function getCustomers() {
  const list = document.getElementById("customersList");
  list.innerHTML = "Cargando...";

  try {
    const res = await fetch(`${API_URL}/customers/db`);

    const customers = await res.json();
    console.log(customers);
    list.innerHTML = "";

    customers.data.forEach((c) => {
      currentCustomers.push(c);
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
    <h3>${c.name}</h3>
    <div class="plan">📦 Plan: <strong>${c.plan}</strong> · ${c.megas}mbts</div>

    <div class="info">
      <span>📧 ${c.email || "Sin correo"}</span>
      <span>📞 ${c.phone || "—"}</span>
    </div>

    <div class="copy-id"> 
      <button class="copy-btn" data-id="${c._id}">Copiar ID</button>
    </div>
  `;

      card.querySelector(".copy-btn").addEventListener("click", (e) => {
        navigator.clipboard.writeText(e.target.dataset.id);
        e.target.innerText = "Copiado ✔";
        setTimeout(() => (e.target.innerText = "Copiar"), 1500);
      });

      customersList.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = "Error cargando clientes";
  }
}

// ---------- FACTURAS ----------
async function getInvoices() {
  const table = document.getElementById("invoicesTable");
  const clientId = document.getElementById("clientIdInput").value;

  table.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  let url = `${API_URL}/payments`;
  if (clientId) url += `/${clientId}`;
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
      console.log(inv);
      const limitDate = inv.dueDate.split("T")[0];
      table.innerHTML += `
        <tr>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.customerId?.name || "—"}</td>
          <td>${inv.status}</td>
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

function openModal(type) {
  document.getElementById("modalBackdrop").classList.remove("hidden");

  if (type === "customer") {
    document.getElementById("modalCustomer").classList.remove("hidden");
  }

  if (type === "invoice") {
    setCustomersPickList();
    document.getElementById("modalInvoice").classList.remove("hidden");
  }
}

function closeModal() {
  resetServices();
  resetModalFields("modalCustomer");
  resetModalFields("modalInvoice");
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.getElementById("modalCustomer").classList.add("hidden");
  document.getElementById("modalInvoice").classList.add("hidden");
}

function resetServices() {
  const container = document.getElementById("servicesContainer");

  container.innerHTML = `
    <div class="service-row">
      <select class="options service-name"> 
        <option value="Netflix">Netflix</option>
      </select>
      <input type="number" class="service-price" placeholder="Precio" />
    </div>
  `;
}

function resetModalFields(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  // Limpiar inputs
  modal.querySelectorAll("input").forEach((input) => {
    if (
      input.type === "number" ||
      input.type === "text" ||
      input.type === "email" ||
      input.type === "date"
    ) {
      input.value = "";
    }
  });

  // Resetear selects
  modal.querySelectorAll("select").forEach((select) => {
    select.selectedIndex = 0;
  });
}

async function submitCustomer() {
  const payload = {
    status: c_status.value,
    name: c_name.value,
    email: c_email.value,
    phone: c_phone.value,
    plan: c_plan.value,
    megas: Number(c_megas.value),
    date_to_Pay: new Date(c_date.value).toISOString(),
    services: getServicesPayload(),
  };

  console.log("Creating customer:", payload);

  await fetch(`${API_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  closeModal();
  getCustomers();
}

function getServicesPayload() {
  const services = [];
  console.log(document.querySelectorAll(".service-row"));
  document.querySelectorAll(".service-row").forEach((row) => {
    const name = row.querySelector(".service-name").value;
    const price = Number(row.querySelector(".service-price").value || 0);

    if (name && price) {
      services.push({ name, price });
    }
  });

  return services;
}

async function submitInvoice() {
  const date = new Date(i_dia_instalacion.value);
  const payload = {
    dia_instalacion: `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`,
    dbId: i_cliente.value,
    plan: i_plan.value,
    megas: i_megas.value,
    precio: Number(i_precio.value),
    pagado: i_pagado.checked,
    dueDate: null,
  };

  console.log("Creating invoice:", payload);

  await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  closeModal();
  getInvoices();
}

function addNewService() {
  const container = document.getElementById("servicesContainer");

  const div = document.createElement("div");
  div.className = "service-row";

  div.innerHTML = `
    <select class="options service-name"> 
      <option value="Netflix">Netflix</option>
    </select>

    <input
      type="number"
      class="service-price"
      placeholder="Precio"
    />

    <button onclick="this.parentElement.remove()" title="Eliminar">
      ❌
    </button>
  `;

  container.appendChild(div);
}

function setCustomersPickList() {
  const container = document.getElementById("invoiceForm");
  if (document.getElementById("i_cliente")) {
    return;
  }
  const div = document.createElement("div");
  div.className = "customers_list";

  div.innerHTML = `
  <label for="i_cliente">Cliente</label>
    <select class="options customer" id="i_cliente"> 
      ${currentCustomers.map((customer) => {
        return `<option value="${customer._id}">${customer.name}</option>`;
      })}
    </select> 
  `;

  container.appendChild(div);
}
getCustomers();
getInvoices();
