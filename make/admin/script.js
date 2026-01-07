// const API_URL = "http://localhost:3000/api/v1";
const API_URL = "https://make-gold.vercel.app/api/v1";

//
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

// ---------- CLIENTES ----------
let currentCustomers = [];

async function getCustomers() {
  currentCustomers = [];
  const list = document.getElementById("customersList");
  list.innerHTML = "Cargando...";

  try {
    const res = await fetch(`${API_URL}/customers/db`);

    const customers = await res.json();

    list.innerHTML = "";

    const currentStatusClass = (status) => {
      return status === "Processed"
        ? "status-green"
        : status === "Agendado"
        ? "status-yellow"
        : "status-red";
    };
    customers.data.forEach((c) => {
      currentCustomers.push(c);
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
    <div id="header_card"> 
    <h3>${c.name}</h3> 
  <span class="status_client ${currentStatusClass(c.status)}"
            ><b>${c.status}</b></span
          >
    </div>
    <div class="plan">📦 Plan: <strong>${c.plan}</strong> · ${c.megas}mbts</div>

    <div class="info"> 
      <span>📧 ${c.email || "Sin correo"}</span>
      <span>📞 ${c.phone || "—"}</span>
    </div>

    <div class="actions-customer"> 
      <button class="copy-btn btn" data-id="${c._id}">Copiar ID</button>
      <button class="show-btn btn" data-id="${c._id}">Ver</button>
      <button class="edit-btn btn" data-id="${c._id}">Editar</button>
      <button class="delete-btn btn" data-id="${c._id}">Eliminar</button>
    </div>
  `;

      card.querySelector(".copy-btn").addEventListener("click", (e) => {
        navigator.clipboard.writeText(e.target.dataset.id);
        e.target.innerText = "Copiado ✔";
        setTimeout(() => (e.target.innerText = "Copiar"), 1500);
      });

      card.querySelector(".delete-btn").addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        showAlert(
          "¿Eliminar cliente?",
          "Esta acción no se puede deshacer",
          "warning",
          true,
          deleteCustomer,
          "customer",
          id,
          "eliminado"
        );
      });

      card.querySelector(".show-btn").addEventListener("click", (e) => {
        const customer2View = currentCustomers.find(
          (cust) => cust._id === e.target.dataset.id
        );
        document.getElementById("client_view_name").innerText =
          customer2View.name;
        //
        const client_view_stage = document.getElementById("client_view_stage");
        client_view_stage.classList.add(
          currentStatusClass(customer2View.status)
        );
        client_view_stage.innerHTML = `<b>${customer2View.status}</b>`;
        //
        document.getElementById("client_view_phone").innerText =
          (customer2View.phone && `📞 ${customer2View.phone}`) || "—";
        document.getElementById("client_view_email").innerText =
          (customer2View.email && `📧 ${customer2View.email}`) || "—";
        document.getElementById(
          "client_view_plan"
        ).innerText = `📦 ${customer2View.plan} · ${customer2View.megas} Mbps`;
        document.getElementById("client_view_date").innerText = new Date(
          customer2View.date_to_Pay
        ).toLocaleDateString();
        document.getElementById("client_view_registred_date").innerText =
          new Date(customer2View.createdAt).toLocaleDateString();

        const tableBody = document.getElementById("client_view_services");
        tableBody.innerHTML = "";
        customer2View.services.forEach((service) => {
          tableBody.innerHTML += `
        <tr>
          <td style="text-align: center;">${service.name}</td>
          <td style="text-align: center;">$${service.price}</td>
        </tr>
      `;
        });

        openModal("viewCustomer");
      });

      card.querySelector(".edit-btn").addEventListener("click", (e) => {
        const customer2View = currentCustomers.find(
          (cust) => cust._id === e.target.dataset.id
        );

        document.getElementById("c_e_name").value = customer2View.name;
        document.getElementById("c_e_id").value = customer2View._id;
        document.getElementById("c_e_email").value = customer2View.email;
        document.getElementById("c_e_phone").value = customer2View.phone;
        document.getElementById("c_e_plan").value = customer2View.plan;
        document.getElementById("c_e_megas").value = customer2View.megas;
        document.getElementById("c_e_date").value = new Date(
          customer2View.date_to_Pay
        )
          .toISOString()
          .substring(0, 10);
        document.getElementById("c_e_status").value = customer2View.status;

        const container = document.getElementById("servicesContainerEdit");
        container.innerHTML = "";
        customer2View.services.forEach((service) => {
          const div = document.createElement("div");
          div.className = "service-row";

          div.innerHTML = `
            <select class="options service-name" value="${service.name}"> 
              <option value="Netflix">Netflix</option>
            </select>

            <input
              type="number"
              class="service-price"
              placeholder="Precio" value="${service.price}"
            />

            <button onclick="this.parentElement.remove()" title="Eliminar">
              ❌
            </button>
          `;

          container.appendChild(div);
        });
        openModal("modalCustomerEdit");
      });

      customersList.appendChild(card);
    });
  } catch (err) {
    list.innerHTML = "Error cargando clientes";
  }
}
//Show Alert
function showAlert(
  title,
  text,
  icon,
  showCancelButton,
  customFunction,
  type,
  id,
  method
) {
  Swal.fire({
    title,
    text,
    icon,
    showCancelButton,
    confirmButtonText: "Sí",
    cancelButtonText: "Cancelar",
  })
    .then((result) => {
      if (result.isConfirmed) {
        const data = customFunction(id);

        let typeText = type === "customer" ? "Cliente" : "Factura";
        Swal.fire(
          data ? `Success` : "Error",
          data
            ? `${typeText} ${method} correctamente`
            : `${typeText} no  ${method}`,
          data ? "success" : "error"
        );

        setTimeout(() => {
          closeModal();
          getCustomers();
          getInvoices();
        }, 2000);
      }
    })
    .finally(() => {});

  return true;
}
//--------- CRUD Custmers-----------------
async function deleteCustomer(customerId) {
  try {
    await fetch(`${API_URL}/customers/${customerId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return true;
  } catch (error) {
    console.error("Error deleting customer:", error);
    return false;
  }
}
//-----------------

// ---------- FACTURAS ----------

async function fetchInvoices(clientId = null) {
  try {
    let url = `${API_URL}/payments`;
    if (clientId) url += `/${clientId}`;
    const res = await fetch(url);
    const invoices = await res.json();
    return invoices;
  } catch (error) {
    console.error(err);
  }
}

async function getInvoices(filters_ = null) {
  const table = document.getElementById("invoicesTable");
  const tableFoot = document.getElementById("invoiceCount");
  const clientId = document.getElementById("clientIdInput").value;
  table.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  try {
    const invoices = await fetchInvoices(clientId);
    table.innerHTML = "";
    tableFoot.innerHTML = "";

    if (invoices.data.length === 0) {
      table.innerHTML = `<tr><td colspan="5">No hay facturas</td></tr>`;
      tableFoot.innerHTML = ` <tr>
              <th scope="row" colspan="7">Count: 0</th>
            </tr>`;
      return;
    }

    const invoiceFilterResponse = await invoicesFiltered(
      invoices.data,
      filters_
    );
    invoiceFilterResponse.forEach((inv) => {
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
            <button style="background-color: red;" onclick="deleteInvoice('${
              inv._id
            }', '${inv.invoiceNumber}')">Delete</button>
          </td>
        </tr>
      `;
    });

    tableFoot.innerHTML = ` <tr>
              <th scope="row" colspan="7">
              Count: ${
                invoiceFilterResponse.length
              }  -  Total: $${invoiceFilterResponse.reduce(
      (acc, obj) => acc + obj.total,
      0
    )} MXN
              </th>
            </tr>`;
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="5">Error cargando facturas</td></tr>`;
  }
}

const invoicesFiltered = (data, filters_) => {
  return data.filter(({ status, installationDate }) => {
    const month = installationDate.split("-")[1];
    const year = installationDate.split("-")[2];
    const filterYear = filters_?.[2] ?? null;
    const filterMonth = filters_?.[1] ?? null;
    const filterStatus = filters_?.[0]?.toLowerCase() ?? null;

    const matchMonth = !filterMonth || filterMonth === month;
    const matchStatus = !filterStatus || filterStatus === status.toLowerCase();
    const matchYear = !filterYear || filterYear === year;

    return matchMonth && matchStatus && matchYear;
  });
};
// ---------- PDF ----------
function downloadPDF(invoiceId) {
  window.open(`${API_URL}/payments/pdf?invoice_id=${invoiceId}`, "_blank");
}
function deleteInvoice(invoiceId, invoiceNumber) {
  try {
    showAlert(
      `Estas seguro de eliminar la factura ${invoiceNumber}?`,
      `Esta acción no se puede deshacer`,
      "warning",
      true,
      async (id) => {
        await fetch(`${API_URL}/payments/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
      },
      "invoice",
      invoiceId,
      "eliminada"
    );
  } catch (error) {
    console.error("Error deleting invoice:", error);
  }
}

function openModal(type) {
  document.getElementById("modalBackdrop").classList.remove("hidden");

  if (type === "customer") {
    document.getElementById("modalCustomer").classList.remove("hidden");
  }
  if (type === "viewCustomer") {
    document.getElementById("modalCustomerView").classList.remove("hidden");
  }
  if (type === "modalCustomerEdit") {
    document.getElementById("modalCustomerEdit").classList.remove("hidden");
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
  document.getElementById("modalCustomerView").classList.add("hidden");
  document.getElementById("modalCustomerEdit").classList.add("hidden");
}

function resetServices() {
  const container = document.getElementById("servicesContainer");

  container.innerHTML = ``;
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

  await fetch(`${API_URL}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  closeModal();
  getCustomers();
}

async function saveCustomer() {
  try {
    const payload = {
      status: c_e_status.value,
      name: c_e_name.value,
      email: c_e_email.value,
      phone: c_e_phone.value,
      plan: c_e_plan.value,
      megas: Number(c_e_megas.value),
      date_to_Pay: new Date(c_e_date.value).toISOString(),
      services: getServicesPayload(),
    };

    showAlert(
      "Actualizar cliente?",
      null,
      "info",
      true,
      async () => {
        await fetch(`${API_URL}/customers/${c_e_id.value}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      },
      "customer",
      c_e_id.value,
      "actualizado"
    );
  } catch (error) {
    console.error("Error updating customer:", error);
  }
}

function getServicesPayload() {
  const services = [];
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

  await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  closeModal();
  getInvoices();
}

function addNewService(modal) {
  const container = document.getElementById(modal);

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

  container.querySelectorAll(".customers_list").forEach((el) => el.remove());

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

function filter() {
  const filtersCurrent = [];
  const filterByStatus = document.getElementById("status_filter");
  filtersCurrent[0] = filterByStatus.value;
  const filterByMonth = document.getElementById("month_filter");
  filtersCurrent[1] = filterByMonth.value;
  const filterByYear = document.getElementById("year_filter");
  filtersCurrent[2] = filterByYear.value;
  getInvoices(filtersCurrent);
}

async function loadGoogleCharts() {
  const year = document.getElementById("year_filter_chart").value;
  const month = document.getElementById("month_filter_chart").value;

  const invoices = await fetchInvoices(null);

  const invoicesFilterResponse = await invoicesFiltered(invoices.data, [
    null,
    month,
    year,
  ]);

  const starlinkPricesTotal = [1305, 680].reduce((a, b) => a + b, 0);
  const priceCompleted =
    invoicesFilterResponse
      .filter((i) => i.status === "Pagado")
      .map((i) => i.total)
      .reduce((a, b) => a + b, 0) || 0;
  //
  const pricePending = Math.max(starlinkPricesTotal - priceCompleted, 0);

  const percentCompleted = (priceCompleted / starlinkPricesTotal) * 100;

  const percentPending = (pricePending / starlinkPricesTotal) * 100;

  summaryMonth(starlinkPricesTotal, priceCompleted);
  // Load google charts
  google.charts.load("current", { packages: ["corechart"] });
  google.charts.setOnLoadCallback(drawChart);

  // Draw the chart and set the chart values
  function drawChart() {
    var data = google.visualization.arrayToDataTable([
      ["Estado", "Porcentaje"],
      ["Costo cubierto", percentCompleted],
      ["Costo pendiente", percentPending],
    ]);

    // Optional; add a title and set the width and height of the chart
    var options = {
      title: "Costo Cubierto de Internet Starlink",
      pieSliceTextStyle: {
        color: "black",
      },
      legend: "none",
    };

    // Display the chart inside the <div> element with id="piechart"
    var chart = new google.visualization.PieChart(
      document.getElementById("piechart")
    );
    chart.draw(data, options);
  }
}

function summaryMonth(gastos, ingresos) {
  document.getElementById("gastos").innerText = `$${gastos}`;
  document.getElementById("ingresos").innerText = `$${ingresos}`;

  document.getElementById("ganancia").innerText = `$${ingresos - gastos}`;
  document
    .getElementById("gn-m")
    .classList.add(ingresos - gastos > 0 ? "green" : "red");
}
getCustomers();
getInvoices();
