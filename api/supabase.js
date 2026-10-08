
export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Faltan las variables de Supabase en Vercel."
    });
  }

  try {
    if (req.query.action === "upload-product-image") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
          error: "Este método solo acepta POST."
        });
      }

      const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceRoleKey) {
        return res.status(500).json({
          error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel."
        });
      }

      const { contenido, tipo } = req.body || {};

      const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (
        typeof contenido !== "string" ||
        !tiposPermitidos.includes(tipo)
      ) {
        return res.status(400).json({
          error: "Envía una imagen JPG, PNG o WEBP válida."
        });
      }

      const coincidencia = contenido.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/
      );

      const tipoContenido = coincidencia
        ? coincidencia[1]
        : tipo;

      const base64 = coincidencia
        ? coincidencia[2]
        : contenido;

      if (!tiposPermitidos.includes(tipoContenido)) {
        return res.status(400).json({
          error: "El formato de la imagen no está permitido."
        });
      }

      const estimadoBytes = Math.floor(
        base64.length * 3 / 4
      );

      if (
        !base64 ||
        estimadoBytes <= 0 ||
        estimadoBytes > 5 * 1024 * 1024
      ) {
        return res.status(413).json({
          error: "La imagen supera el límite de 5 MB."
        });
      }

      const buffer = Buffer.from(base64, "base64");

      if (
        !buffer.length ||
        buffer.length > 5 * 1024 * 1024
      ) {
        return res.status(413).json({
          error: "La imagen supera el límite de 5 MB."
        });
      }

      const extensionPorTipo = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      };

      const nombreFinal =
        `producto-${Date.now()}-${cryptoRandomId()}.` +
        extensionPorTipo[tipoContenido];

      const rutaStorage =
        `${supabaseUrl}/storage/v1/object/productos/${nombreFinal}`;

      const respuestaStorage = await fetch(rutaStorage, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": tipoContenido,
          "Cache-Control": "public, max-age=31536000",
          "x-upsert": "false"
        },
        body: buffer
      });

      const textoStorage = await respuestaStorage.text();

      if (!respuestaStorage.ok) {
        let detalle = textoStorage;

        try {
          const errorStorage = textoStorage
            ? JSON.parse(textoStorage)
            : null;

          detalle =
            errorStorage?.message ||
            errorStorage?.error ||
            textoStorage;
        } catch {
          // Conserva el mensaje original.
        }

        return res.status(respuestaStorage.status).json({
          error: "Supabase no pudo guardar la foto.",
          detalle
        });
      }

      const foto_url =
        `${supabaseUrl}/storage/v1/object/public/productos/${nombreFinal}`;

      return res.status(200).json({
        ok: true,
        foto_url,
        nombreArchivo: nombreFinal
      });
    }

    const table = req.query.table;

    if (!table) {
      return res.status(400).json({
        error: "Falta indicar la tabla."
      });
    }

    const tablasPermitidas = [
      "productos",
      "configuracion",
      "clientes",
      "ventas",
      "detalle_ventas",
      "cierres_turno",
      "usuarios"
    ];

    if (!tablasPermitidas.includes(table)) {
      return res.status(400).json({
        error: "Tabla no permitida."
      });
    }

    const url = new URL(
      `${supabaseUrl}/rest/v1/${table}`
    );

    const allowedParams = [
      "select",
      "order",
      "limit",
      "offset",
      "id",
      "activo",
      "whatsapp",
      "corte_id",
      "venta_id",
      "cliente_id",
      "usuario",
      "rol",
      "nombre"
    ];

    for (const key of allowedParams) {
      if (req.query[key] !== undefined) {
        url.searchParams.set(key, req.query[key]);
      }
    }

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const options = {
      method: req.method,
      headers
    };

    if (
      req.method !== "GET" &&
      req.method !== "HEAD"
    ) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(
      url.toString(),
      options
    );

    const text = await response.text();

    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return res.status(response.status).json({
        error: "Supabase no devolvió JSON.",
        detalle: text
      });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Error en /api/supabase:", error);

    return res.status(500).json({
      error: "Error de conexión con Supabase.",
      detalle: error.message
    });
  }
}

function cryptoRandomId() {
  return Array.from(
    { length: 16 },
    () => Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
