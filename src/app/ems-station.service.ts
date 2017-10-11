import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import {Http} from '@angular/http';

import {
  CircleMarker,
  GeoJSON,
  Map,
  Popup
} from 'leaflet';
import * as L from 'leaflet';

import {MapService} from 'revolsys-angular-leaflet';
import {RiverService} from './river.service';
import {EmsStationLocations} from './EmsStationLocations';

@Injectable()
export class EmsStationService {
  private emsStationLayerById: {[id: number]: any} = {};

  public emsStationLayersByWatershedCode: {[id: string]: any[]} = {};

  highlightedEmsStationLocations: EmsStationLocations;

  highlightedEmsStations: any[] = [];


  emsStationsLayer: GeoJSON;

  emsStationSource = 0;

  public selectedEmsStation: any;

  public selectedEmsStationChange: Subject<any> = new Subject<any>();

  public selectedEmsStationLocations: EmsStationLocations;

  constructor(
    private mapService: MapService,
    private riverService: RiverService
  ) {
    this.highlightedEmsStationLocations = new EmsStationLocations(this, riverService.highlightedRiverLocations);
    this.selectedEmsStationLocations = new EmsStationLocations(this, riverService.selectedRiverLocations);
  }

  public addEmsStation(emsStationLayer: any) {
    const id = emsStationLayer.feature.properties.id;
    this.emsStationLayerById[id] = emsStationLayer;
    const watershedCode = emsStationLayer.feature.properties.FWA_WATERSHED_CODE;
    let layers = this.emsStationLayersByWatershedCode[watershedCode];
    if (!layers) {
      layers = this.emsStationLayersByWatershedCode[watershedCode] = [];
    }
    layers.push(emsStationLayer);
  }

  public clear() {
    this.emsStationLayerById = {};
    this.emsStationLayersByWatershedCode = {};
    this.highlightedEmsStations.length = 0;
    this.highlightedEmsStationLocations.clear();
    this.selectedEmsStationLocations.clear();
  }

  public getEmsStationLayer(id: number): any {
    return this.emsStationLayerById[id];
  }

  public init() {
    this.mapService.withMap(map => {
      map.on({
        'click': e => this.setSelectedEmsStation(null)
      });
      this.emsStationsLayer = L.geoJson([], {
        pointToLayer: function(feature, latlng) {
          return new CircleMarker(latlng, {
            radius: 6,
            fillColor: '#FFFFE0',
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: (feature, layer) => {
          layer.bringToFront();
          this.addEmsStation(layer);
        }
      }).on({
        mouseover: this.emsStationMouseOver.bind(this),
        mouseout: this.emsStationMouseOut.bind(this),
        click: this.emsStationClick.bind(this)
      })
        .setZIndex(2);
      this.mapService.addOverlayLayer(this.emsStationsLayer, 'Environmental Monitoring System Station');
      const loadHandler = (e) => {
        const zoom = map.getZoom();
        if (zoom >= 10) {
          if (this.emsStationSource !== 1) {
            this.clear();
            this.mapService.loadJson(
              this.emsStationsLayer,
              'https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/EMS_Monitoring_Locations_QUES.geojson'
            );
            this.emsStationSource = 1;
          }
        } else if (zoom <= 9) {
          if (this.emsStationSource !== 2) {
            this.clear();
            this.emsStationsLayer.clearLayers();
            this.emsStationSource = 2;
          }
        }
      };
      map.on('zoomend', loadHandler.bind(this));
      loadHandler(null);
    });
    this.riverService.highlightedRiverLocations.subscribe((river) => {
      this.highlightedEmsStationLocations.setEmsStationsForRiver(river);
    });
    this.riverService.selectedRiverLocations.subscribe((river) => {
      this.selectedEmsStationLocations.setEmsStationsForRiver(river);
    });
  }

  private emsStationMouseOver(e) {
  }

  private emsStationMouseOut(e) {
  }

  private emsStationClick(e) {
    L.DomEvent.stopPropagation(e);
    const emsStation = e.layer.feature;
    this.setSelectedEmsStation(emsStation);
  }

  setSelectedEmsStation(emsStation: any) {
    this.selectedEmsStation = emsStation;

    if (emsStation) {
      const id = emsStation.properties.MONITORING_LOCATION_ID;

      this.mapService.getWfsFeatures(
        'https://openmaps.gov.bc.ca/geo/pub/wfs',
        'pub:WHSE_ENVIRONMENTAL_MONITORING.EMS_MONITORING_LOCATIONS', {
          'cql_filter': 'MONITORING_LOCATION_ID=' + id
        }, (features) => {
          console.log(features);
        }
      );
    }
    this.selectedEmsStationChange.next(this.selectedEmsStation);
  }

  setStyle(stationLayer) {
    const style = this.emsStationStyle(stationLayer);
    stationLayer.setStyle(style);
  }

  private emsStationStyle(stationLayer): any {
    const stationId = stationLayer.feature.properties['MONITORING_LOCATION_ID'];
    if (this.highlightedEmsStationLocations.onStreamIds.indexOf(stationId) !== -1) {
      return {
        fillColor: 'Aqua',
        weight: 2
      };
    } else if (this.highlightedEmsStationLocations.downstreamIds.indexOf(stationId) !== -1) {
      return {
        fillColor: 'Red',
        weight: 2
      };
    } else if (this.selectedEmsStationLocations.onStreamIds.indexOf(stationId) !== -1) {
      return {
        fillColor: 'DarkTurquoise',
        weight: 2,
        dashArray: null
      };
    } else if (this.selectedEmsStationLocations.downstreamIds.indexOf(stationId) !== -1) {
      return {
        fillColor: 'FireBrick',
        weight: 2,
        dashArray: null
      };
    } else {
      return {
        color: 'Black',
        fillColor: 'LightYellow',
        weight: 1,
        dashArray: null
      };
    }
  }

}
