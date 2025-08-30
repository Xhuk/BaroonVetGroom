// server/tilesProxy.ts
import express from "express";

export const tilesProxy = express.Router();

// 7 days caching (tune as you like)
const CACHE_CONTROL = "public, max-age=604800, immutable";

tilesProxy.get("/osm/:z/:x/:y.png", async (req, res) => {
  const { z, x, y } = req.params;
  const upstream = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const r = await fetch(upstream, {
      headers: {
        // Be polite per OSM policy
        "User-Agent": "VetGroomMaps/1.0 (contact: support@yourdomain.example)",
      },
    });

    if (!r.ok || !r.body) {
      res.status(r.status || 502).send(`Upstream error ${r.status}`);
      return;
    }

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", CACHE_CONTROL);

    // Stream image bytes through your origin
    r.body.pipe(res);
  } catch (err: any) {
    console.error("Tile proxy error:", err?.message || err);
    res.status(502).send("Tile proxy error");
  }
});
