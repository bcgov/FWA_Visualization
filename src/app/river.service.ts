import {Config} from "./Config";
import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subject} from 'rxjs';

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
import {WatershedCodeRange} from "./WatershedCodeRange";
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
            this.loadRiversBinary(`${Config.baseUrl}/bin/bc.bin`);
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

  private loadRiversBinary(file: string) {
    const loadIndex = ++this.loadIndex;
    this.http.get(file, {
      responseType: 'arraybuffer'
    }).subscribe(buffer => {
      if (loadIndex === this.loadIndex) {
        const layer = this.riversLayer;
        this.clear();
        layer.clearLayers();
        this.readBinary(buffer, record => {
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
        layer.addData({
          'type': 'FeatureCollection',
          'features': Object.keys(tileRecordsById).map(key => tileRecordsById[key])
        });
      } else {
        this.http.get(`${Config.baseUrl}/bin/${tileSize}/${tileId}.bin`, {
          responseType: 'arraybuffer'
        })//
          .subscribe(buffer => {
            if (loadIndex === this.loadIndex) {
              tileRecordsById = {};
              this.tileRecordsByIdAndTileId[tileId] = tileRecordsById;
              this.readBinary(buffer, record => {
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

  private localCode(watershedCode: WatershedCode,
    properties: any, fieldName: string) {
    const localWatershedCode = properties['CODE'];
    if (localWatershedCode) {
      if (localWatershedCode.indexOf('-') == 3 || localWatershedCode.length == 3) {
        return new WatershedCode(localWatershedCode);
      } else {
        return new WatershedCode(watershedCode.code + '-' + localWatershedCode);
      }
    } else {
      return watershedCode;
    }
  }

  private readBinary(buffer: ArrayBuffer, callback: (record: any) => void) {
    const length = buffer.byteLength;
    const data = new DataView(buffer);
    let offset = 0;
    const code = {};
    while (offset < length) {
      const properties = {};
      offset = this.readBinaryInt(data, offset, properties, 'LINEAR_FEATURE_ID');
      offset = this.readBinaryInt(data, offset, properties, 'GNIS_ID');
      offset = this.readBinaryWatershedCode(data, offset, code, 'CODE');
      const watershedCode = new WatershedCode(code['CODE']);
      offset = this.readBinaryWatershedCode(data, offset, code, 'CODE');
      const localMin = this.localCode(watershedCode, code, 'CODE');
      offset = this.readBinaryWatershedCode(data, offset, code, 'CODE');
      const localMax = this.localCode(watershedCode, code, 'CODE');
      offset = this.readBinaryDouble(data, offset, properties, 'DOWNSTREAM_LENGTH');
      offset = this.readBinaryDouble(data, offset, properties, 'UPSTREAM_LENGTH');
      offset = this.readBinaryDoubleIntScale(data, offset, 1000.0, properties, 'LENGTH');
      this.nameService.setName(properties);
      properties['codeRange'] = new WatershedCodeRange(watershedCode, localMin, localMax);
      const record = {
        'type': 'Feature',
        'properties': properties
      };
      offset = this.readBinaryLineString(data, offset, record);
      callback(record);
    }
  }

  private readBinaryInt(data: DataView, offset: number, properties: any, name: string) {
    properties[name] = data.getInt32(offset, false);
    return offset + 4;
  }

  private readBinaryDoubleIntScale(data: DataView, offset: number, scale: number, properties: any, name: string) {
    const intValue = data.getInt32(offset, false);
    properties[name] = intValue / scale;
    return offset + 4;
  }

  private readBinaryDouble(data: DataView, offset: number, properties: any, name: string) {
    properties[name] = data.getFloat64(offset, false);
    return offset + 8;
  }

  private readBinaryWatershedCode(data: DataView, offset: number, properties: any, name: string) {
    let count = data.getInt8(offset);
    let partLen = 3;
    if (count < 0) {
      count = -count;
      partLen = 6;
    }
    offset += 1;
    let watershedCode: string;
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        if (watershedCode) {
          watershedCode += '-';
        } else {
          watershedCode = '';
        }
        const part = data.getInt32(offset, false).toString();
        offset += 4;

        for (let i = part.length; i < partLen; i++) {
          watershedCode += '0';
        }
        watershedCode += part;
        partLen = 6;
      }
    }
    properties[name] = watershedCode;
    return offset;
  }

  private readBinaryLineString(data: DataView, offset: number, record: any) {
    const vertexCount = data.getInt32(offset, false);
    offset += 4;
    if (vertexCount > 0) {
      let coordinates = [];
      for (let i = 0; i < vertexCount; i++) {
        const lonInt = data.getInt32(offset, false);
        offset += 4;
        const latInt = data.getInt32(offset, false);
        offset += 4;
        coordinates.push([
          lonInt / 10000000.0,
          latInt / 10000000.0,
        ]);
      }
      record['geometry'] = {
        'type': 'LineString',
        'coordinates': coordinates
      };
    }
    return offset;
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
