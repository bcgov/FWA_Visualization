import {Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';
import {Subject} from 'rxjs/Subject';

import {
  CircleMarker,
  GeoJSON
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

  constructor(
    private http: Http,
    private mapService: MapService
  ) {
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
          if (this.riverSource !== 1) {
            this.riverSource = 1;
            this.clear();
            this.loadRivers('https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/QUES_2O_NET10M.geojson');
          }
        } else if (zoom <= 9) {
          if (this.riverSource !== 2) {
            this.riverSource = 2;
            this.loadRivers('https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/FWA_BC_200M.geojson');
          }
        }
      };
      map.on('zoomend', loadHandler.bind(this));
      //      loadHandler(null);
    });
  }



  public loadRivers(file: string) {
    const loadIndex = ++this.loadIndex;
    this.http.get(file).toPromise().then(response => {
      if (loadIndex === this.loadIndex) {
        const layer = this.riversLayer;
        this.clear();
        layer.clearLayers();
        const json = response.json();
        layer.addData(json);
      }
    });
  }

  public addRiver(riverLayer: any) {
    const id = riverLayer.feature.properties.id;
    this.riverLayerById[id] = riverLayer;
  }

  public clear() {
    this.riverLayerById = {};
    this.highlightedRiverLocations.clear();
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
    const riverId = feature.properties.id;
    if (this.highlightedRiverLocations.id === riverId) {
      return {
        color: 'Aqua',
        weight: 3
      };
    } else if (this.highlightedRiverLocations.upstreamIds.indexOf(riverId) !== -1) {
      return {
        color: 'Lime',
        weight: 3
      };
    } else if (this.highlightedRiverLocations.downstreamIds.indexOf(riverId) !== -1) {
      return {
        color: 'Red',
        weight: 3
      };
    } else if (this.selectedRiverLocations.id === riverId) {
      return {
        color: 'DarkTurquoise',
        weight: 5
      };
    } else if (this.selectedRiverLocations.upstreamIds.indexOf(riverId) !== -1) {
      return {
        color: 'LimeGreen',
        weight: 5
      };
    } else if (this.selectedRiverLocations.downstreamIds.indexOf(riverId) !== -1) {
      return {
        color: 'FireBrick',
        weight: 5
      };
    } else {
      return {
        color: 'RoyalBlue',
        weight: 1
      };
    }
  }

}
