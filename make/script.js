// Obtener clientId desde la URL
const params = new URLSearchParams(window.location.search);
const clientId = params.get("clientId");

console.log("Client ID:", clientId);
const receiptsContainer = document.getElementById("receipts");
const clientInfo = document.getElementById("client-info");
const error = document.getElementById("error");

if (!clientId) {
  error.textContent = "❌ No se proporcionó un ID de cliente.";
  throw new Error("Client ID missing");
}

clientInfo.textContent = `Cliente ID: ${clientId}`;

// ⚠️ Simulación de respuesta del backend
// Luego esto vendrá de: GET /api/clients/:id/receipts
const mockReceipts = [
  {
    id: "R-1001",
    date: "2025-01-10",
    amount: 1500,
    fileUrl: "/public/receipts/recibo-1001.pdf"
  },
  {
    id: "R-1002",
    date: "2025-02-10",
    amount: 2000,
    fileUrl: "/public/receipts/recibo-1002.pdf"
  }
];

// Renderizar recibos
mockReceipts.forEach(receipt => {
  const div = document.createElement("div");
  div.className = "receipt";

  div.innerHTML = `
    <span>
      <strong>${receipt.id}</strong><br />
      Fecha: ${receipt.date}<br />
      Monto: $${receipt.amount}
    </span>
    <button>Descargar</button>
  `;

  div.querySelector("button").onclick = () => {
    window.open(receipt.fileUrl, "_blank");
  };

  receiptsContainer.appendChild(div);
});
