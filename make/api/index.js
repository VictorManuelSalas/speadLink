import express from "express";
import cors from "cors";
// import serverless from "serverless-http";

const app = express();

app.use(express.json({ limit: "50mb" }));

// 🔌 Conectar DB
import connectDB from "./config/db.js";
connectDB(); 

app.use(cors());


// Rutas
import routerApi from "./router/index.js";
routerApi(app);

// export const handler = serverless(app);
// export default handler;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));
