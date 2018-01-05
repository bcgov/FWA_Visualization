import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subject} from 'rxjs/Subject';

import {
  CircleMarker,
  GeoJSON,
  Map
} from 'leaflet';
import * as L from 'leaflet';

import {FwaMapComponent} from './fwamap/fwa-map.component';
import {MapService} from 'revolsys-angular-leaflet';
import {RiverLocations} from './RiverLocations';
@Injectable()
export class RiverService {

  private riverLayerById: {[id: number]: any} = {};

  highlightedRiverLocations = new RiverLocations(this);

  riversLayer: GeoJSON;

  riverSource = 0;

  loadIndex = 0;

  selectedRiverLocations = new RiverLocations(this);

  static tileSize = 10000;

  private tileRecordsById: {[id: string]: {[riverId: string]: any}} = {};

  public addRiver(riverLayer: any) {
    const properties = riverLayer.feature.properties;
    const id = properties.id;
    this.riverLayerById[id] = riverLayer;
  }

  public clear() {
    this.riverLayerById = {};
    this.highlightedRiverLocations.clear();
  }

  constructor(
    private http: HttpClient,
    public mapService: MapService
  ) {
  }

  public getRiver(id: number): any {
    const riverLayer = this.getRiverLayer(id);
    if (riverLayer) {
      return riverLayer.feature;
    } else {
      return null;
    }
  }

  public getRiverLayer(id: number): any {
    return this.riverLayerById[id];
  }

  public init() {
    this.mapService.withMap(map => {
      map.on({
        'click': e => this.selectedRiverLocations.setRiver(null)
      });

      this.riversLayer = L.geoJson([], {
        style: (feature) => {
          return this.riverStyle(feature);
        },
        onEachFeature: (feature, layer) => {
          this.addRiver(layer);
        }
      }) //
        .on({
          mouseover: this.riverMouseOver.bind(this),
          mouseout: this.riverMouseOut.bind(this),
          click: this.riverClick.bind(this)
        }) //
        .setZIndex(1)
        .addTo(map);
      this.mapService.addOverlayLayer(this.riversLayer, 'FWA Stream Network');
      const loadHandler = (e) => {
        const zoom = map.getZoom();
        if (zoom >= 10) {
          this.riverSource = 1;
          this.loadTiles(map);
        } else if (zoom <= 9) {
          if (this.riverSource !== 2) {
            this.riverSource = 2;
            this.loadRivers('https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/FWA_BC_200M.geojson');
          }
        }
      };
      map.on('moveend', loadHandler.bind(this));
      map.on('zoomend', loadHandler.bind(this));
    });
  }



  private loadRivers(file: string) {
    const loadIndex = ++this.loadIndex;
    this.http.get(file).toPromise().then(response => {
      if (loadIndex === this.loadIndex) {
        const layer = this.riversLayer;
        this.clear();
        layer.clearLayers();
        layer.addData(response);
      }
    });
  }


  private loadTiles(map: Map) {
    const loadIndex = ++this.loadIndex;
    const layer = this.riversLayer;
    const min = L.CRS.EPSG3857.project(map.getBounds().getSouthWest());
    const max = L.CRS.EPSG3857.project(map.getBounds().getNorthEast());
    const tileMinX = Math.floor(min.x / RiverService.tileSize) * RiverService.tileSize;
    const tileMinY = Math.floor(min.y / RiverService.tileSize) * RiverService.tileSize;
    const tileMaxX = Math.ceil(max.x / RiverService.tileSize) * RiverService.tileSize;
    const tileMaxY = Math.ceil(max.y / RiverService.tileSize) * RiverService.tileSize;
    const tileIds = [];
    for (let tileY = tileMinY; tileY < tileMaxY; tileY += RiverService.tileSize) {
      for (let tileX = tileMinX; tileX < tileMaxX; tileX += RiverService.tileSize) {
        tileIds.push([tileX, tileY]);
      }
    }
    this.clear();
    layer.clearLayers();
    const recordsById = {};
    const tileRecordsById = {};
    for (const tileId of tileIds) {
      let tileRecordsById = this.tileRecordsById[tileId];
      if (tileRecordsById) {
        tileRecordsById[tileId] = tileRecordsById;
      } else {
        tileRecordsById = {};
        tileRecordsById[tileId] = tileRecordsById;

        const tileX = tileId[0];
        const tileY = tileId[1];
        this.http.get(`http://bcgovdata.revolsys.com:8885/fwa/tiles/3857/10000/${tileX}/${tileY}.tsv`, {
          responseType: 'text'
        })//
          .subscribe(text => {
            if (loadIndex === this.loadIndex) {

              let first = true;
              for (const line of text.split('\n')) {
                if (first) {
                  first = false;
                } else if (line) {
                  const fields = line.split('\t');
                  const id = fields[0];
                  const watershedCode = fields[1].replace(/"/g, '');
                  let localWatershedCode = fields[2].replace(/"/g, '');
                  if (localWatershedCode) {
                    localWatershedCode = watershedCode + '-' + localWatershedCode;
                  } else {
                    localWatershedCode = watershedCode
                  }
                  const lineString = fields[3].replace(/"/g, '');

                  const coordinates = [];
                  for (const point of lineString.substring(21, lineString.length - 1).split(',')) {
                    const parts = point.split(' ');
                    const x = Number(parts[0]);
                    const y = Number(parts[1]);
                    const latLng = L.CRS.EPSG3857.unproject(L.point(x, y));
                    coordinates.push([latLng.lng, latLng.lat]);
                  }
                  const record = {
                    'type': 'Feature',
                    'geometry': {
                      'type': 'LineString',
                      'coordinates': coordinates
                    },
                    'properties': {
                      'id': id,
                      'fwawsc': watershedCode,
                      'localwsc': localWatershedCode
                    }
                  };
                  tileRecordsById[id] = record;
                  if (!recordsById[id]) {
                    layer.addData(record);
                  }
                }
              }
            }
          }, err => {
          });

      }
      Object.assign(recordsById, tileRecordsById);
    }
    layer.addData({
      'type': 'FeatureCollection',
      'features': Object.keys(recordsById).map(key => recordsById[key])
    });

    this.tileRecordsById = tileRecordsById;
  }

  resetStyles() {
    this.riversLayer.eachLayer(layer => this.riversLayer.resetStyle(layer));
  }

  private riverClick(e) {
    L.DomEvent.stopPropagation(e);
    const riverLayer = e.layer;
    this.selectedRiverLocations.setRiver(riverLayer);
  }

  private riverMouseOver(e) {
    const riverLayer = e.layer;
    this.highlightedRiverLocations.setRiver(riverLayer);
  }

  private riverMouseOut(e) {
    this.highlightedRiverLocations.setRiver(null);
  }

  private riverStyle(feature): any {
    const highlightLocation = this.highlightedRiverLocations.getRiverLocation(feature);
    if (highlightLocation === 0) {
      return {
        color: 'Aqua',
        weight: 3
      };
    } else if (highlightLocation === 1) {
      return {
        color: 'Lime',
        weight: 3
      };
    } else if (highlightLocation === -1) {
      return {
        color: 'Red',
        weight: 3
      };
    } else {
      const selectLocation = this.selectedRiverLocations.getRiverLocation(feature);
      if (selectLocation === 0) {
        return {
          color: 'DarkTurquoise',
          weight: 5
        };
      } else if (selectLocation === 1) {
        return {
          color: 'LimeGreen',
          weight: 5
        };
      } else if (selectLocation === -1) {
        return {
          color: 'FireBrick',
          weight: 5
        };
      }
    }
    return {
      color: 'RoyalBlue',
      weight: 1
    };
  }
}
