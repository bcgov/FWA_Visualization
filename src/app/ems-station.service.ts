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

import {
  MapService,
  WfsLayer,
  ZoomLayerGroup
} from 'revolsys-angular-leaflet';
import {RiverService} from './river.service';
import {EmsStationLocations} from './EmsStationLocations';

@Injectable()
export class EmsStationService {
  public emsStationLayerById: {[key: number]: any} = {};

  public emsStationIdsByWatershedCode: {[key: string]: string[]} = {};

  public emsStationIdsByLocalWatershedCode: {[key: string]: string[]} = {};

  emsStationSource = 0;

  emsStationsLayer: GeoJSON;

  highlightedEmsStationLocations: EmsStationLocations;

  public localWatershedCodeById: {[id: string]: string} = {};

  public nameById: {[id: string]: string} = {};

  public selectedEmsStation: any;

  public selectedEmsStationChange: Subject<any> = new Subject<any>();

  public selectedEmsStationLocations: EmsStationLocations;

  public watershedCodeById: {[key: string]: string} = {};

  constructor(
    private http: Http,
    private mapService: MapService,
    private riverService: RiverService
  ) {
    this.highlightedEmsStationLocations = new EmsStationLocations(this, riverService.highlightedRiverLocations);
    this.selectedEmsStationLocations = new EmsStationLocations(this, riverService.selectedRiverLocations);
    this.http.get('https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/ems_station.json').toPromise().then(response => {
      for (const emsStation of response.json()) {
        const id = emsStation[0];
        const watershedCode = emsStation[2];
        let localWatershedCode = emsStation[3];
        if (localWatershedCode) {
          if (localWatershedCode.indexOf('-') === 0) {
            localWatershedCode = watershedCode + localWatershedCode;
          }
        } else {
          localWatershedCode = watershedCode;
        }
        this.nameById[id] = emsStation[1];
        this.watershedCodeById[id] = watershedCode;
        this.localWatershedCodeById[id] = localWatershedCode;
        this.addToList(this.emsStationIdsByWatershedCode, watershedCode, id);
        this.addToList(this.emsStationIdsByLocalWatershedCode, localWatershedCode, id);
      }
    });
  }

  private addToList(map: {[key: string]: string[]}, key: string, value: string) {
    let values = map[key];
    if (!values) {
      values = map[key] = [];
    }
    values.push(value);
  }

  public addEmsStation(emsStationLayer: any) {
    const props = emsStationLayer.feature.properties;
    const id = props['MONITORING_LOCATION_ID'];
    this.emsStationLayerById[id] = emsStationLayer;
    const watershedCode = props['FWA_WATERSHED_CODE'];
  }

  public getEmsStationLayer(id: number): any {
    return this.emsStationLayerById[id];
  }

  public init() {
    this.mapService.withMap(map => {
      map.on({
        'click': e => this.setSelectedEmsStation(null)
      });
      const emsStationsLayerNew = new WfsLayer({
        url: 'http://openmaps.gov.bc.ca/geo/pub/WHSE_ENVIRONMENTAL_MONITORING.EMS_MONITORING_LOCN_TYPES_SVW/ows',
        typeName: 'WHSE_ENVIRONMENTAL_MONITORING.EMS_MONITORING_LOCN_TYPES_SVW',
        minZoom: 10,
        pointToLayer: (feature, latlng) => {
          const id = feature.properties['MONITORING_LOCATION_ID'];
          const style = this.emsStationStyle(id);
          return new CircleMarker(latlng, style);
        },
        onEachFeature: (feature, layer) => {
          layer.bringToFront();
          this.addEmsStation(layer);
        }
      }).on({
        click: this.emsStationClick.bind(this),
        preUpdate: () => {
          this.emsStationLayerById = {};
          this.highlightedEmsStationLocations.clear();
        }
      })
        .setZIndex(2);


      this.mapService.addOverlayLayer(
        new ZoomLayerGroup([emsStationsLayerNew], {minZoom: 10}),
        'Environmental Monitoring System Station (new)'
      );
    });
    this.riverService.highlightedRiverLocations.subscribe((river) => {
      this.highlightedEmsStationLocations.setEmsStationsForRiver(river);
    });
    this.riverService.selectedRiverLocations.subscribe((river) => {
      this.selectedEmsStationLocations.setEmsStationsForRiver(river);
    });
  }

  private emsStationClick(e) {
    L.DomEvent.stopPropagation(e);
    const emsStation = e.layer.feature;
    this.setSelectedEmsStation(emsStation);
  }

  setSelectedEmsStation(emsStation: any) {
    this.selectedEmsStation = emsStation;
    this.selectedEmsStationChange.next(this.selectedEmsStation);
  }

  setStyle(stationLayer) {
    const stationId = stationLayer.feature.properties['MONITORING_LOCATION_ID'];
    const style = this.emsStationStyle(stationId);
    stationLayer.setStyle(style);
  }

  private emsStationStyle(stationId: string): any {
    const style = {
      radius: 6,
      fillColor: 'LightYellow',
      color: 'Black',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    };
    if (this.highlightedEmsStationLocations.onStreamIds.indexOf(stationId) !== -1) {
      style['fillColor'] = 'Aqua';
      style['weight'] = 2;
    } else if (this.highlightedEmsStationLocations.downstreamIds.indexOf(stationId) !== -1) {
      style['fillColor'] = 'Red';
      style['weight'] = 2;
    } else if (this.selectedEmsStationLocations.onStreamIds.indexOf(stationId) !== -1) {
      style['fillColor'] = 'DarkTurquoise';
      style['weight'] = 2;
    } else if (this.selectedEmsStationLocations.downstreamIds.indexOf(stationId) !== -1) {
      style['fillColor'] = 'FireBrick';
      style['weight'] = 2;
    }
    return style;
  }

}
