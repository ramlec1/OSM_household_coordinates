from flask import render_template, request, jsonify, Blueprint

from .household_map import build_household_map, validate_search_params, DEFAULT_LAT, DEFAULT_LON, DEFAULT_RADIUS

main = Blueprint('main', __name__)

@main.route("/")
def home():
    """Render the main page with an initial map."""
    # Render an initial map using defaults (so the page isn't blank on first load)
    map_html, _ = build_household_map(DEFAULT_LAT, DEFAULT_LON, DEFAULT_RADIUS)
    return render_template(
        "index.html",
        map_html=map_html,
        lat=DEFAULT_LAT,
        lon=DEFAULT_LON,
        radius=DEFAULT_RADIUS,
        errors={},
    )

@main.route("/search", methods=["POST"])
def search_households():
    """API endpoint used by the frontend to fetch updated map HTML."""
    data = request.get_json(silent=True) or request.form

    lat = data.get("lat")
    lon = data.get("lon")
    radius = data.get("radius")

    params, errors = validate_search_params(lat, lon, radius)
    if errors:
        return jsonify({"errors": errors}), 400

    map_html, meta = build_household_map(params["lat"], params["lon"], params["radius"])

    if meta.get("error"):
        # Return a user-visible error message without crashing the server.
        return jsonify({"errors": {"form": meta["error"]}}), 400

    return jsonify({
        "map_html": map_html,
        "params": params,
        "meta": meta,
    })
