# Household Finder

**Author:** Marcel van den Broek, 2026

A web application that searches for households in OpenStreetMap and displays them on an interactive map. Enter a location and radius to retrieve OSM elements with `addr:housenumber` within the area.

---

## Usage

Run the Flask application:

```bash
python run_MMN_calculator.py
```

The server starts at **http://0.0.0.0:5000** (accessible on your network). Open a browser and navigate to `http://localhost:5000`.

---

## Notes

- **OSM data completeness:** Only OSM objects with `addr:housenumber` are used. Missing or incomplete tags will not appear on the map.
- **Overpass API:** The app uses public Overpass endpoints; large radii may hit timeouts.
- **Search radius:** 1 m – 100 km (configurable).


