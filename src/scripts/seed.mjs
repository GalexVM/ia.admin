import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://navia:Zefiron1!@host.docker.internal:27018/admin_ia?authSource=admin";

const TenantConfigSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    company_name: { type: String, default: "Inmobiliaria Demo" },
    chatbot_name: { type: String, default: "Sofía Zefiron" },
    chatbot_url: { type: String, default: "" },
    status: { type: String, default: "pending_onboarding" },
    configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
    sync_history: { type: Array, default: [] },
  },
  { timestamps: true }
);

const TenantConfig = mongoose.models.TenantConfig || mongoose.model("TenantConfig", TenantConfigSchema);

async function runSeed() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log("Conectado a MongoDB.");

  const testToken = "demo-cliente-2026";
  const existing = await TenantConfig.findOne({ token: testToken });

  if (!existing) {
    await TenantConfig.create({
      token: testToken,
      company_name: "Inmobiliaria Panorama",
      chatbot_name: "Sofía",
      chatbot_url: "",
      status: "pending_onboarding",
      configuration: {
        company_profile: {
          company_name: "Inmobiliaria Panorama",
          industry: "Bienes Raíces",
          description: "Desarrolladora inmobiliaria líder en condominios residenciales de lujo.",
          website: "https://inmobiliariapanorama.com",
          contact_email: "ventas@inmobiliariapanorama.com",
          phone: "+51 987 654 321",
        },
        bot_persona: {
          chatbot_name: "Sofía",
          fallback_agent: "Asesor Comercial Juan",
          writing_tone: "friendly",
          language: "es",
          welcome_message: "¡Hola! Soy Sofía, asistente virtual de Inmobiliaria Panorama. ¿En qué proyecto estás interesado hoy?",
          fallback_message: "Permíteme comunicarte con Juan del equipo comercial para que te dé todos los detalles.",
        },
        rules_features: {
          enable_lead_capture: true,
          enable_booking: true,
          enable_human_escalation: true,
          enable_faq: true,
          business_hours: {
            enabled: true,
            schedule: "Lunes a Sábado 09:00 - 19:00",
          },
          custom_rules: "Siempre consultar si el cliente busca entrega inmediata o en preventa.",
          banned_topics: "No ofrecer descuentos superiores al 5% sin autorización de gerencia.",
        },
      },
    });
    console.log(`Tenant de prueba creado con éxito. Token: ${testToken}`);
    console.log(`URL de prueba: http://localhost:3000/setup/${testToken}`);
  } else {
    console.log(`El tenant con token '${testToken}' ya existe en la base de datos.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error("Error al ejecutar seed:", err);
  process.exit(1);
});
