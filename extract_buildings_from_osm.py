import osmium
import shapely.wkb as wkblib
from shapely.geometry import Point
import geopandas as gpd
from uuid import uuid4

class BuildingHandler(osmium.SimpleHandler):
    def __init__(self):
        super(BuildingHandler, self).__init__()
        self.wkbfab = osmium.geom.WKBFactory()
        self.buildings = []
        self.error_count = 0

    def way(self, w):
        if 'building' in w.tags and w.is_closed():
            try:
                wkb = self.wkbfab.create_multipolygon(w)
                geom = wkblib.loads(wkb, hex=True)
                centroid = geom.centroid
                self.buildings.append({
                    'id': str(uuid4()),
                    'building_type': w.tags.get('building', 'unknown'),
                    'geometry': centroid
                })
            except Exception as e:
                self.error_count += 1
                print(f"Skipping way ID {w.id} due to error: {e}")

    def relation(self, r):
        if 'building' in r.tags:
            try:
                wkb = self.wkbfab.create_multipolygon(r)
                geom = wkblib.loads(wkb, hex=True)
                centroid = geom.centroid
                self.buildings.append({
                    'id': str(uuid4()),
                    'building_type': r.tags.get('building', 'unknown'),
                    'geometry': centroid
                })
            except Exception as e:
                print(f"Skipping relation ID {r.id} due to error: {e}")

    def node(self, n):
        if 'building' in n.tags:
            point = Point(n.location.lon, n.location.lat)
            self.buildings.append({
                'id': str(uuid4()),
                'building_type': n.tags.get('building', 'unknown'),
                'geometry': point
            })

def extract_buildings(osm_file, output_geojson):
    handler = BuildingHandler()
    handler.apply_file(osm_file, locations=True)
    print(handler.count, "ways with errors encountered.")
    if not handler.buildings:
        print("No buildings found in the OSM file.")
        return
    print(len(handler.buildings))  # Print first 5 buildings for debugging
    gdf = gpd.GeoDataFrame(handler.buildings, crs="EPSG:4326")
    gdf.to_file(output_geojson, driver='GeoJSON')
    print(f"✅ GeoJSON saved to: {output_geojson}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Extract building centroids from an OSM file.")
    parser.add_argument("input_osm", help="Path to input .osm file")
    parser.add_argument("output_geojson", help="Path to output .geojson file")

    args = parser.parse_args()
    extract_buildings(args.input_osm, args.output_geojson)

if __name__ == "__main__":
    main()

