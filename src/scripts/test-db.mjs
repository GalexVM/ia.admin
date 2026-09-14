import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://navia:Zefiron1!@host.docker.internal:27018/admin_ia?authSource=admin";
console.log("Probando conexión autenticada a MongoDB...");

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  console.log("¡Conexión y autenticación exitosa a MongoDB!");
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Colecciones existentes:", collections.map(c => c.name));
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error("Fallo al conectar a MongoDB:", err.message);
  process.exit(1);
}
