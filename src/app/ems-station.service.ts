import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import {
  CircleMarker,
  GeoJSON,
  Map,
  Popup
} from 'leaflet';
import * as L from 'leaflet';

import { MapComponent } from './map/map.component';
import { RiverService } from './river.service';

@Injectable()
export class EmsStationService {
  private emsStationLayerById: { [id: number]: any } = {};

  private emsStationLayersByWatershedCode: { [id: number]: any[] } = {};

  highlightedEmsStation: any;

  highlightedEmsStations: any[] = [];

  private highlightedStyle = {
    fillColor: '#00FFFF'
  };

  private highlightedStyleDescendent = {
    fillColor: '#FF0000'
  };

  emsStationsLayer: GeoJSON;

  emsStationSource = 0;

  public selectedEmsStation: any;

  public selectedEmsStationChange: Subject<any> = new Subject<any>();

  constructor(private riverService: RiverService) {
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
    this.clearHighlighted();
  }

  private clearHighlighted() {
    this.highlightedEmsStation = null;
    for (const oldEmsStationLayer of this.highlightedEmsStations) {
      this.emsStationsLayer.resetStyle(oldEmsStationLayer);
    }
    this.highlightedEmsStations = [];
  }

  public init(mapComponent: MapComponent, map: Map) {
    this.emsStationsLayer = L.geoJson([], {
      pointToLayer: function(feature, latlng) {
        return new CircleMarker(latlng, {
          radius: 6,
          fillColor: 'LightYellow',
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
      .setZIndex(2)
      .addTo(map);
    mapComponent.layerControl.addOverlay(this.emsStationsLayer, 'Environmental Monitoring System Station');
    const loadHandler = (e) => {
      const zoom = map.getZoom();
      if (zoom >= 10) {
        if (this.emsStationSource !== 1) {
          mapComponent.loadJson(
            this.emsStationsLayer,
            'https://rawgit.com/IanLaingBCGov/FWA_Visualization/FWA_EMS_Assets/EMS_Monitoring_Locations_QUES.geojson'
          );
          this.emsStationSource = 1;
        }
      } else if (zoom <= 9) {
        if (this.emsStationSource !== 2) {
          this.emsStationsLayer.clearLayers();
          this.emsStationSource = 2;
        }
      }
    };
    map.on('zoomend', loadHandler.bind(this));
    loadHandler(null);

    this.riverService.highlightedRiverChange.subscribe((highlightedRiver) => {
      this.clearHighlighted();
      if (highlightedRiver) {
        const riverWatershedCode = highlightedRiver.feature.properties.fwawsc;
        const riverLocalWatershedCode = highlightedRiver.feature.properties.localwsc;
        for (const highlightedWatershedCode of Object.keys(this.riverService.highlightedWatershedCodes)) {
          const highlightedLocalWatershedCode = this.riverService.highlightedWatershedCodes[highlightedWatershedCode];
          const stations = this.emsStationLayersByWatershedCode[highlightedWatershedCode];
          if (stations) {
            for (const station of stations) {
              const stationLocalWatershedCode = station.feature.properties.LOCAL_WATERSHED_CODE;
              let style;
              if (highlightedWatershedCode === riverWatershedCode && stationLocalWatershedCode === riverLocalWatershedCode) {
                style = this.highlightedStyle;
              } else if (highlightedWatershedCode <= riverWatershedCode && stationLocalWatershedCode < riverLocalWatershedCode) {
                style = this.highlightedStyleDescendent;
              }
              station.bringToFront();
              station.setStyle(style);
              this.highlightedEmsStations.push(station);
            }
          }
        }
      }
    });
  }

  private emsStationMouseOver(e) {
  }

  private emsStationMouseOut(e) {
  }

  private emsStationClick(e) {
    this.selectedEmsStation = e.layer.feature;
    this.selectedEmsStationChange.next(this.selectedEmsStation);
  }
}
