// AJAX form submission for updating the map without a full page reload.

const form = document.getElementById('search-form');
const mapContainer = document.getElementById('map-container');
const metaCount = document.getElementById('household-count');

const errorFields = {
  lat: document.getElementById('error-lat'),
  lon: document.getElementById('error-lon'),
  radius: document.getElementById('error-radius'),
  form: document.getElementById('form-error'),
};

function clearErrors() {
  Object.values(errorFields).forEach((el) => {
    if (el) el.textContent = '';
  });
}

function setFieldError(name, message) {
  const el = errorFields[name];
  if (el) {
    el.textContent = message;
  }
}

function setFormError(message) {
  const el = errorFields.form;
  if (el) {
    el.textContent = message;
  }
}

async function submitSearch(event) {
  event.preventDefault();
  clearErrors();

  const formData = new FormData(form);
  const jsonData = {
    lat: formData.get('lat'),
    lon: formData.get('lon'),
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
      if (data.errors) {
        Object.entries(data.errors).forEach(([key, msg]) => {
          setFieldError(key, msg);
        });
      } else {
        setFormError('An unexpected error occurred.');
      }
      return;
    }

    if (data.map_html) {
      mapContainer.innerHTML = data.map_html;
      setTimeout(() => {
        const maps = mapContainer.querySelectorAll('.leaflet-container');
        maps.forEach((m) => {
          if (m._leaflet_id && m._leaflet_map) {
            m._leaflet_map.invalidateSize();
          }
        });
      }, 200);
    }

    if (data.meta && typeof data.meta.household_count !== 'undefined') {
      metaCount.textContent = String(data.meta.household_count);
    }
  } catch (err) {
    setFormError('Network error while fetching map. Please try again.');
    console.error(err);
  }
}

form.addEventListener('submit', submitSearch);
