/**
 * Frontend logic for the Household Finder.
 * Handles: search (Overpass → map), choose-on-map (pick lat/lon for search center).
 */

// ── DOM references ───────────────────────────────────────────────────────────
const searchForm    = document.getElementById('search-form');
const mapContainer  = document.getElementById('map-container');
const mapLoading    = document.getElementById('map-loading');
const metaCount       = document.getElementById('household-count');
const downloadJsonBtn = document.getElementById('download-json-btn');

let _lastHouseholds = [];
let _lastParams = null;  // search params from last successful search

const searchErrorFields = {
  lat:    document.getElementById('error-lat'),
  lon:    document.getElementById('error-lon'),
  radius: document.getElementById('error-radius'),
  form:   document.getElementById('form-error'),
};

function clearErrors(fields) {
  Object.values(fields).forEach((el) => { if (el) el.textContent = ''; });
}

function setErrors(fields, errors) {
  Object.entries(errors).forEach(([key, msg]) => {
    const el = fields[key] || fields.form;
    if (el) el.textContent = msg;
  });
}

function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

async function submitSearch(event) {
  event.preventDefault();
  clearErrors(searchErrorFields);
  stopChooseOnMap();

  const searchBtn = document.getElementById('search-btn');
  setLoading(searchBtn, true);
  mapLoading.classList.add('is-loading');
  mapLoading.setAttribute('aria-hidden', 'false');

  const formData = new FormData(searchForm);  // FormData reads input values by name
  const jsonData = {
    lat:    formData.get('lat'),
    lon:    formData.get('lon'),
    radius: formData.get('radius'),
  };

  try {
    const resp = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jsonData),
    });

    const data = await resp.json();

    if (!resp.ok) {
      setErrors(searchErrorFields, data.errors || { form: 'An unexpected error occurred.' });
      _lastHouseholds = [];
      _lastParams = null;
      if (downloadJsonBtn) downloadJsonBtn.disabled = true;
      return;
    }

    if (data.map_html) {
      mapContainer.innerHTML = data.map_html;  // Folium injects an iframe with the map
      setTimeout(() => {
        // Leaflet needs invalidateSize after container is shown
        mapContainer.querySelectorAll('.leaflet-container').forEach((m) => {
          if (m._leaflet_id && m._leaflet_map) m._leaflet_map.invalidateSize();
        });
      }, 200);
    }

    if (data.meta && typeof data.meta.household_count !== 'undefined') {
      metaCount.textContent = String(data.meta.household_count);
    }

    _lastHouseholds = data.households || [];
    _lastParams = data.params || null;
    if (downloadJsonBtn) downloadJsonBtn.disabled = false;
  } catch (err) {
    setErrors(searchErrorFields, { form: 'Network error while fetching map. Please try again.' });
    console.error(err);
  } finally {
    setLoading(searchBtn, false);
    mapLoading.classList.remove('is-loading');
    mapLoading.setAttribute('aria-hidden', 'true');
  }
}

// ── Download JSON ────────────────────────────────────────────────────────────

function downloadHouseholdsJson() {
  if (!_lastParams) return;
  const payload = {
    params: _lastParams,
    household_count: _lastHouseholds.length,
    households: _lastHouseholds,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `households_${_lastParams.lat.toFixed(4)}_${_lastParams.lon.toFixed(4)}_r${_lastParams.radius}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

if (downloadJsonBtn) {
  downloadJsonBtn.addEventListener('click', downloadHouseholdsJson);
}

// ── Choose on map ────────────────────────────────────────────────────────────

const chooseOnMapBtn = document.getElementById('choose-on-map-btn');
const mapPickOverlay = document.getElementById('map-pick-overlay');

/** Return the Leaflet L.Map instance inside the Folium iframe, or null. */
function getFoliumLeafletMap() {
  // Folium renders its map HTML inside an <iframe>
  const iframe = mapContainer.querySelector('iframe');
  if (!iframe || !iframe.contentWindow) return null;
  const iWin = iframe.contentWindow;
  // Leaflet stores every map instance in L.map._instances (Leaflet >=1.6),
  // but the most reliable way is to search iWin for variables that are L.Map instances.
  if (!iWin.L) return null;
  // Iterate all own properties of the iframe window looking for a Leaflet Map.
  for (const key of Object.keys(iWin)) {
    const val = iWin[key];
    if (val && val instanceof iWin.L.Map) return val;
  }
  return null;
}

let _pickHandler = null;

function startChooseOnMap() {
  const map = getFoliumLeafletMap();
  if (!map) return;

  // Show hint banner and toggle button state
  mapPickOverlay.hidden = false;
  chooseOnMapBtn.textContent = 'Cancel';
  chooseOnMapBtn.classList.add('active');

  // Use Leaflet's crosshair cursor while picking
  map.getContainer().style.cursor = 'crosshair';

  _pickHandler = function(e) {
    // e.latlng = { lat, lng } from Leaflet click event
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lon').value = e.latlng.lng.toFixed(6);
    stopChooseOnMap();
  };
  map.once('click', _pickHandler);  // one-shot: handler auto-removed after first click
}

function stopChooseOnMap() {
  mapPickOverlay.hidden = true;
  chooseOnMapBtn.textContent = 'Choose on map';
  chooseOnMapBtn.classList.remove('active');

  const map = getFoliumLeafletMap();
  if (map) {
    map.getContainer().style.cursor = '';
    if (_pickHandler) {
      map.off('click', _pickHandler);  // remove if user cancelled before clicking
      _pickHandler = null;
    }
  }
}

if (chooseOnMapBtn) {
  chooseOnMapBtn.addEventListener('click', () => {
    if (chooseOnMapBtn.classList.contains('active')) {
      stopChooseOnMap();
    } else {
      startChooseOnMap();
    }
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────

searchForm.addEventListener('submit', submitSearch);   // form submit → POST /search
