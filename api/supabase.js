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

    const params = { ...req.query };
    delete params.table;
    delete params.chatgpt;

    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const headers = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const options = {
      method: req.method,
      headers
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(response.status).json({
        error: "Supabase no devolvió JSON.",
        detalle: text
      });
    }

    return res.status(response.status).json(data);

  } catch (error) {
    return res.status(500).json({
      error: "Error de conexión con Supabase.",
      detalle: error.message
    });
  }
}
