import mongoose from "mongoose";

const mongoURI = "mongodb+srv://Vercel-Admin-Speadlink:lCiL4C6tCOTbyJPu@speadlink.s2lgmcn.mongodb.net/?retryWrites=true&w=majority";
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, { 
    });

    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectDB;
