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
  //        private readonly baseUrl = 'https://bcgov.revolsys.com:8445/fwa/tiles/3857';
  private readonly baseUrl = '/tiles/3857';

  highlightedRiverLocations = new RiverLocations(this);

  loadIndex = 0;

  private riverLayerById: {[id: number]: any} = {};

  riverSource = 0;

  riversLayer: GeoJSON;

  selectedRiverLocations = new RiverLocations(this);

  private tileSize = -1;

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
        console.log(zoom);
        let tileSize = 0;
        if (zoom >= 11) {
          tileSize = 5000;
        } else if (zoom >= 10) {
          tileSize = 10000;
        } else if (zoom >= 7) {
          tileSize = 500000;
        } else {
          tileSize = 0;
        }
        if (tileSize != this.tileSize) {
          this.tileSize = tileSize;
          this.tileRecordsById = {};
          if (tileSize == 0) {
            this.loadRiversTsv(`${this.baseUrl}/bc.tsv`);
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
        this.http.get(`${this.baseUrl}/${tileSize}/${tileX}/${tileY}.tsv`, {
          responseType: 'text'
        })//
          .subscribe(text => {
            if (loadIndex === this.loadIndex) {
              this.parseTsv(text, record => {
                const id = record.properties.id;
                if (!(id in recordsById)) {
                  tileRecordsById[id] = record;
                  recordsById[id] = record;
                  layer.addData(record);
                }
              });
            }
          }, err => {
          });

      }
      Object.assign(recordsById, tileRecordsById);
    }
    console.log(Object.keys(recordsById).length);
    layer.addData({
      'type': 'FeatureCollection',
      'features': Object.keys(recordsById).map(key => recordsById[key])
    });

    this.tileRecordsById = tileRecordsById;
  }

  private parseTsv(text: string, callback: (record: any) => void) {
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
