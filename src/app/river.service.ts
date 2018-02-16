import {Config} from "./Config";
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
import {WatershedCode} from './WatershedCode';
import {GnisNameService} from "./gnis-name.service";

@Injectable()
export class RiverService {

  highlightedRiverLocations = new RiverLocations(this);

  loadIndex = 0;

  private riverLayerById: {[id: number]: any} = {};

  riverSource = 0;

  riversLayer: GeoJSON;

  selectedRiverLocations = new RiverLocations(this);

  private tileSize = -1;

  private tileRecordsByIdAndTileId: {[tileId: string]: {[riverId: string]: any}} = {};

  public addRiver(riverLayer: any) {
    const properties = riverLayer.feature.properties;
    const id = properties['LINEAR_FEATURE_ID'];
    this.riverLayerById[id] = riverLayer;
  }

  public clear() {
    this.riverLayerById = {};
    this.highlightedRiverLocations.clear();
  }

  constructor(
    private http: HttpClient,
    public mapService: MapService,
    public nameService: GnisNameService
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

  zoomTileSizes = {
    6: 1000000,
    7: 500000,
    8: 200000,
    9: 100000,
    10: 50000,
    11: 20000,
  };

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
        let tileSize = 0;
        if (zoom >= 11) {
          tileSize = 20000;
        } else {
          tileSize = this.zoomTileSizes[zoom];
          if (!tileSize) {
            tileSize = 0;
          }
        }
        if (tileSize != this.tileSize) {
          this.tileSize = tileSize;
          this.tileRecordsByIdAndTileId = {};
          if (tileSize == 0) {
            this.loadRiversTsv(`${Config.baseUrl}/bc.tsv`);
          }
        }
        if (tileSize > 0) {
          this.loadTiles(map, tileSize);
        }
      };
      map.on('moveend', loadHandler.bind(this));
      map.on('zoomend', loadHandler.bind(this));
      loadHandler(1);
    });
  }



  private loadRivers(file: string) {
    const loadIndex = ++this.loadIndex;
    this.http.get(file).subscribe(response => {
      if (loadIndex === this.loadIndex) {
        const layer = this.riversLayer;
        this.clear();
        layer.clearLayers();
        layer.addData(response);
      }
    });
  }

  private loadRiversTsv(file: string) {
    console.log(file);
    const loadIndex = ++this.loadIndex;
    this.http.get(file, {
      responseType: 'text'
    }).subscribe(text => {
      if (loadIndex === this.loadIndex) {
        const layer = this.riversLayer;
        this.clear();
        layer.clearLayers();
        this.parseTsv(text, record => {
          layer.addData(record);
        });
      }
    });
  }


  private loadTiles(map: Map, tileSize: number) {
    const loadIndex = ++this.loadIndex;
    const layer = this.riversLayer;
    const min = L.CRS.EPSG3857.project(map.getBounds().getSouthWest());
    const max = L.CRS.EPSG3857.project(map.getBounds().getNorthEast());
    const tileMinX = Math.floor(min.x / tileSize) * tileSize;
    const tileMinY = Math.floor(min.y / tileSize) * tileSize;
    const tileMaxX = Math.ceil(max.x / tileSize) * tileSize;
    const tileMaxY = Math.ceil(max.y / tileSize) * tileSize;
    const tileIds = [];
    for (let tileY = tileMinY; tileY < tileMaxY; tileY += tileSize) {
      for (let tileX = tileMinX; tileX < tileMaxX; tileX += tileSize) {
        tileIds.push(tileX + '/' + tileY);
      }
    }
    this.clear();
    layer.clearLayers();

    for (const tileId of Object.keys(this.tileRecordsByIdAndTileId)) {
      if (tileIds.indexOf(tileId) == -1) {
        delete this.tileRecordsByIdAndTileId[tileId];
      }
    }
    for (const tileId of tileIds) {
      let tileRecordsById = this.tileRecordsByIdAndTileId[tileId];
      if (tileRecordsById) {
        console.log(`from cache ${tileId}`);
        layer.addData({
          'type': 'FeatureCollection',
          'features': Object.keys(tileRecordsById).map(key => tileRecordsById[key])
        });
      } else {
        this.http.get(`${Config.baseUrl}/${tileSize}/${tileId}.tsv`, {
          responseType: 'text'
        })//
          .subscribe(text => {
            if (loadIndex === this.loadIndex) {
              tileRecordsById = {};
              this.tileRecordsByIdAndTileId[tileId] = tileRecordsById;
              this.parseTsv(text, record => {
                const id = record.properties['LINEAR_FEATURE_ID'];
                if (!(id in this.riverLayerById)) {
                  tileRecordsById[id] = record;
                  layer.addData(record);
                }
              });
            }
          }, err => {
          });

      }
    }

  }

  private localCode(properties: any, fieldName: string) {
    const localWatershedCode = properties[fieldName];
    const watershedCode = properties['FWA_WATERSHED_CODE']
    if (localWatershedCode) {
      properties[fieldName] = new WatershedCode(watershedCode.toString() + '-' + localWatershedCode);
    } else {
      properties[fieldName] = watershedCode;
    }
  }
  private parseTsv(text: string, callback: (record: any) => void) {
    let fieldNames;
    for (const line of text.split('\n')) {
      if (!fieldNames) {
        fieldNames = line.split('\t');
      } else if (line) {
        const fields = line.split('\t');
        const properties = {};
        let fieldIndex = 0;
        for (const fieldName of fieldNames) {
          properties[fieldName] = fields[fieldIndex];
          fieldIndex++;
        }
        this.nameService.setName(properties);
        properties['FWA_WATERSHED_CODE'] = new WatershedCode(properties['FWA_WATERSHED_CODE']);
        this.localCode(properties, 'MIN_LOCAL_WATERSHED_CODE');
        this.localCode(properties, 'MAX_LOCAL_WATERSHED_CODE');
        const lineString = properties['LineString'];
        delete properties['LineString'];

        const coordinates = [];
        for (const point of lineString.substring(11, lineString.length - 1).split(',')) {
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
          'properties': properties
        };
        callback(record);
      }
    }
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
