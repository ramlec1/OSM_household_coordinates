from __future__ import annotations

from flask import render_template, request, jsonify, Blueprint

from .household_map import (
    build_blank_map,
    build_household_map,
    validate_search_params,
    DEFAULT_LAT,
    DEFAULT_LON,
    DEFAULT_RADIUS,
)

main = Blueprint('main', __name__)


@main.route("/")
def home():
    """Render the main page with default form values and a blank map."""
    map_html = build_blank_map(DEFAULT_LAT, DEFAULT_LON)
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
    """Query Overpass for households and render map."""
    data = request.get_json(silent=True) or request.form
    lat, lon, radius = data.get("lat"), data.get("lon"), data.get("radius")

    params, errors = validate_search_params(lat, lon, radius)
    if errors:
        return jsonify({"errors": errors}), 400

    map_html, meta, households = build_household_map(
        params["lat"], params["lon"], params["radius"]
    )

    if meta.get("error"):
        return jsonify({"errors": {"form": meta["error"]}}), 400

    return jsonify({
        "map_html": map_html,
        "params": params,
        "meta": meta,
    })
