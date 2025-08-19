import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import {MercadoPagoConfig, Preference} from "mercadopago";
//---------------------------------------------------------------------------------------------------------------

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//---------------------------------------------------------------------------------------------------------------


const allowedOrigins = [
  "https://tienda-siempremattes.vercel.app",
  "http://localhost:5173",
    "http://localhost:4000"

];

app.use(cors({
  origin: (origin, cb) => {
    console.log("Request origin:", origin); // <-- agrega esto para debug
    if (!origin) return cb(null, true); // permite herramientas como Postman
    if (allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

//---------------------------------------------------------------------------------------------------------------


const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

//---------------------------------------------------------------------------------------------------------------

const enviarMailNodemailer = async (email, nombre, metodoPago) => {
  const contenido = `
¡Hola ${nombre}!

Envíanos tu comprobante de pago o contactate con nosotros con nuestro WhatsApp (+54) 9 11 2393-9608

Recibirás respuesta en 24/48hs

Gracias por tu compra. Estos son los detalles:

Método de Pago: ${
    metodoPago === "mercado_pago" ? "Mercado Pago" : "Crédito/Débito/Efectivo"
  }

Te contactaremos pronto con más información.

¡Saludos!
Tu Tienda de Mates
`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Confirmación de tu compra",
    text: contenido,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo enviado con éxito");
    return true;
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    return false;
  }
};

app.post("/enviar-mail", async (req, res) => {
  const { email, nombre, metodoPago } = req.body;
  if (!email || !nombre || !metodoPago) {
    return res.status(400).send({ status: "error", error: "Campos incompletos" });
  }

  const exito = await enviarMailNodemailer(email, nombre, metodoPago);
  if (!exito) {
    return res.status(500).send({ status: "error", error: "Error al enviar el correo" });
  }

  res.send({ status: "success", message: "Mail recibido correctamente" });
});

//---------------------------------------------------------------------------------------------------------------

const preference = new Preference(client);

app.post("/crear-preferencia", async (req, res) => { 
  try {
    console.log("datos recibidos del frontend:", req.body); 
    const { items, payer } = req.body;

    const preferenceData = {
      items,
      payer,
       back_urls: {
        success: "https://tienda-siempremattes.vercel.app/final",
        failure: "https://tienda-siempremattes.vercel.app/checkout",
        pending: "https://tienda-siempremattes.vercel.app/checkout",
      },
      auto_return: "approved",
    };

    const result = await preference.create({ body: preferenceData });
    console.log(result);
    res.json({ init_point: result.init_point, id: result.id  });
  } catch (error) {
    console.error ("Error MP:", error);
    res.status(500).send({ error: error.message});
}
});
//---------------------------------------------------------------------------------------------------------------

app.get("/ping", (_, res) => res.send("pong"));


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));