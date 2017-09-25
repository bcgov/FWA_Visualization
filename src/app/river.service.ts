import {Injectable} from '@angular/core';
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

  selectedRiverLocations = new RiverLocations(this);

  constructor(
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
            this.clear();
            this.mapService.loadJson(
              this.riversLayer,
              'https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/QUES_2O_NET10M.geojson'
            );
            this.riverSource = 1;
          }
        } else if (zoom <= 9) {
          if (this.riverSource !== 2) {
            this.clear();
            this.mapService.loadJson(
              this.riversLayer,
              'https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/FWA_BC_200M.geojson'
            );
            this.riverSource = 2;
          }
        }
      };
      map.on('zoomend', loadHandler.bind(this));
      loadHandler(null);
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
        color: '#00FFFF',
        weight: 3
      };
    } else if (this.highlightedRiverLocations.upstreamIds.indexOf(riverId) !== -1) {
      return {
        color: '#00FF00',
        weight: 3
      };
    } else if (this.highlightedRiverLocations.downstreamIds.indexOf(riverId) !== -1) {
      return {
        color: '#FF0000',
        weight: 3
      };
    } else if (this.selectedRiverLocations.id === riverId) {
      return {
        color: '#00CED1',
        weight: 5
      };
    } else if (this.selectedRiverLocations.upstreamIds.indexOf(riverId) !== -1) {
      return {
        color: '#32CD32',
        weight: 5
      };
    } else if (this.selectedRiverLocations.downstreamIds.indexOf(riverId) !== -1) {
      return {
        color: '#B22222',
        weight: 5
      };
    } else {
      return {
        color: 'black',
        weight: 1
      };
    }
  }

}
