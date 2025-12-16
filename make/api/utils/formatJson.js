const planes = {
  Intermedio: 350,
  Basico: 300,
  Custom: 400,
};

const getDate = (day) => {
  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth();

  const date = new Date(year, month, day);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${dd}-${mm}-${yyyy}`;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);

  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];

  const month = months[date.getUTCMonth()];

  return `${day} de ${month} del ${year}`;
};

const formatExcelRows = (payload) => {
  return [
    {
      dia_instalacion: "Día de Cobro",
      cliente: "Cliente",
      plan: "Plan",
      megas: "Megas",
      precio: "Monto",
      pagado: "Pagado",
      status: "Estatus",
      whatsapp: "WhatsApp",
      id: "ID",
      invoice_id: "ID_Invoice"
    },
    ...payload
      .map((item) => ({
        dia_instalacion: getDate(item.row?.b?.value) || "",
        cliente: item.row?.c?.value || "",
        plan: item.row?.m?.value || "",
        megas: item.row?.n?.value || "",
        precio: planes[item.row?.m?.value] || 0,
        pagado: false,
        status: item.row?.a?.value || "",
        whatsapp: item.row?.s?.value || "",
        dbId: item.row?.t?.value || "",
      }))
      .filter(
        (item) =>
          planes[item.plan] !== undefined &&
          !["Iniciado", "Agendado"].includes(item.status)
      ),
  ].map(({ status, ...item }) => ({ ...item }));
};

const formatExcelCustomers = (payload) => {
  return payload
    .map((item) => ({
      cliente: item.row?.c?.value || "",
      whatsapp: item.row?.s?.value || "",
    }))
    .slice(1);
};

export { getDate, formatExcelRows, formatDate, formatExcelCustomers };
