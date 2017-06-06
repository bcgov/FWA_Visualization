import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import {
  CircleMarker,
  GeoJSON,
  Map
} from 'leaflet';
import * as L from 'leaflet';

import { MapComponent } from './map/map.component';

@Injectable()
export class RiverService {
  private riverLayerById: { [id: number]: any } = {};

  highlightedRiver: any;

  private highlightedRivers: any[] = [];

  highlightedWatershedCodes: string[] = [];

  private highlightedStyle = {
    color: '#00FFFF',
    weight: 5
  };

  private highlightedStyleAncestor = {
    color: '#00FF00',
    weight: 5
  };

  private highlightedStyleDescendent = {
    color: '#FF0000',
    weight: 5
  };

  riversLayer: GeoJSON;

  riverSource = 0;

  selectedRiver: string;

  public selectedRiverChange: Subject<any> = new Subject<any>();

  public highlightedRiverChange: Subject<any> = new Subject<any>();

  constructor() {
  }

  public init(mapComponent: MapComponent, map: Map) {
    this.riversLayer = L.geoJson([], {
      style: {
        color: 'Black',
        weight: 1
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
    mapComponent.layerControl.addOverlay(this.riversLayer, 'FWA Stream Network');
    const loadHandler = (e) => {
      const zoom = map.getZoom();
      if (zoom >= 10) {
        if (this.riverSource !== 1) {
          this.clear();
          mapComponent.loadJson(this.riversLayer, 'assets/QUES_2O_NET10M.geojson');
          this.riverSource = 1;
        }
      } else if (zoom <= 9) {
        if (this.riverSource !== 2) {
          this.clear();
          mapComponent.loadJson(this.riversLayer, 'assets/FWA_BC_200M.geojson');
          this.riverSource = 2;
        }
      }
    };
    map.on('zoomend', loadHandler.bind(this));
    loadHandler(null);
  }

  public addRiver(riverLayer: any) {
    const id = riverLayer.feature.properties.id;
    this.riverLayerById[id] = riverLayer;
  }

  public clear() {
    this.riverLayerById = {};
    this.clearHighlightedRiver();
  }

  private clearHighlightedRiver() {
    this.highlightedRiver = null;
    for (const oldRiverLayer of this.highlightedRivers) {
      this.riversLayer.resetStyle(oldRiverLayer);
    }
    this.highlightedRivers = [];
    this.highlightedWatershedCodes = [];
    this.highlightedRiverChange.next(null);
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
    this.setSelectedRiver(e.layer.feature);
  }

  private riverMouseOver(e) {
    const riverLayer = e.layer;
    this.setHighlightedRiver(riverLayer);
  }

  private riverMouseOut(e) {
    this.clearHighlightedRiver();
  }

  public setHighlightedRiver(riverLayer: any) {
    this.highlightedRiver = riverLayer;
    this.clearHighlightedRiver();
    if (riverLayer) {
      this.highlightedRiver = riverLayer;
      riverLayer.setStyle(this.highlightedStyle);
      this.highlightedRivers.push(riverLayer);
      const watershedCode = riverLayer.feature.properties.fwawsc;
      if (this.highlightedWatershedCodes.indexOf(watershedCode) === -1) {
        this.highlightedWatershedCodes.push(watershedCode);
      }
      const river = riverLayer.feature;
      this.setHighlightedRiverStyles(river.properties.a, this.highlightedStyleAncestor, false);
      this.setHighlightedRiverStyles(river.properties.d, this.highlightedStyleDescendent, true);
    }
    this.highlightedRiverChange.next(riverLayer);
  }

  public setSelectedRiver(selectedRiver: any) {
    this.selectedRiver = selectedRiver;
    this.selectedRiverChange.next(selectedRiver);
  }

  private setHighlightedRiverStyles(riverIds: number[], style: any, descendent: boolean) {
    for (const riverId of riverIds) {
      const riverLayer = this.getRiverLayer(riverId);
      if (riverLayer) {
        this.highlightedRivers.push(riverLayer);
        riverLayer.setStyle(style);
        if (descendent) {
          const watershedCode = riverLayer.feature.properties.fwawsc;
          if (this.highlightedWatershedCodes.indexOf(watershedCode) === -1) {
            this.highlightedWatershedCodes.push(watershedCode);
          }
        }
      }
    }
  }
}
