export default async function handler(req, res) {

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Faltan las variables de Supabase en Vercel."
    });
  }

  try {

    const table = req.query.table;

    if (!table) {
      return res.status(400).json({
        error: "Falta indicar la tabla."
      });
    }

    /*
     * Tablas permitidas
     */

    const tablasPermitidas = [
      "productos",
      "configuracion",
      "clientes",
      "ventas",
      "detalle_ventas",
      "cierres_turno"
    ];

    if (!tablasPermitidas.includes(table)) {
      return res.status(400).json({
        error: "Tabla no permitida."
      });
    }


    /*
     * Crear URL de Supabase
     */

    const url = new URL(
      `${supabaseUrl}/rest/v1/${table}`
    );


    /*
     * Filtros permitidos
     */

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

      "cliente_id"

    ];


    /*
     * Pasar filtros a Supabase
     */

    for (
      const key of allowedParams
    ) {

      if (
        req.query[key] !== undefined
      ) {

        url.searchParams.set(
          key,
          req.query[key]
        );

      }

    }


    /*
     * Encabezados
     */

    const headers = {

      apikey: supabaseKey,

      Authorization:
        `Bearer ${supabaseKey}`,

      "Content-Type":
        "application/json",

      Prefer:
        "return=representation"

    };


    /*
     * Configuración de petición
     */

    const options = {

      method: req.method,

      headers

    };


    /*
     * Para POST, PATCH, etc.
     */

    if (
      req.method !== "GET" &&
      req.method !== "HEAD"
    ) {

      options.body =
        JSON.stringify(
          req.body
        );

    }


    /*
     * Enviar a Supabase
     */

    const response =
      await fetch(
        url.toString(),
        options
      );


    const text =
      await response.text();


    /*
     * Intentar convertir respuesta
     * a JSON
     */

    let data;


    try {

      data =
        text
          ? JSON.parse(text)
          : null;

    } catch {

      return res
        .status(response.status)
        .json({

          error:
            "Supabase no devolvió JSON.",

          detalle:
            text

        });

    }


    /*
     * Devolver respuesta
     */

    return res
      .status(response.status)
      .json(data);


  } catch (error) {

    return res
      .status(500)
      .json({

        error:
          "Error de conexión con Supabase.",

        detalle:
          error.message

      });

  }

}
