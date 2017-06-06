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

@Injectable()
export class RiverService {
  private riverLayerById: { [id: number]: any } = {};

  highlightedRiver: any;

  private highlightedRivers: any[] = [];

  private highlightedStyle = {
    color: '#00FFFF',
    weight: 10
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

  private _selectedRiver: string;

  public selectedRiverChange: Subject<string> = new Subject<string>();

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
    const layer = e.target;
    const river = layer.feature;
    if (river) {
      this.selectedRiver = river;
    }
  }

  private riverMouseOver(e) {
    const riverLayer = e.layer;
    const river = riverLayer.feature;
    this.clearHighlightedRiver();
    if (river) {
      this.highlightedRivers = [];
      this.highlightedRiver = river;
      riverLayer.setStyle(this.highlightedStyle);
      this.highlightedRivers.push(riverLayer);
      this.setHighlightedRiverStyles(river.properties.a, this.highlightedStyleAncestor);
      this.setHighlightedRiverStyles(river.properties.d, this.highlightedStyleDescendent);
    } else {
      this.highlightedRiver = null;
    }
  }

  private riverMouseOut(e) {
    this.clearHighlightedRiver();
  }

  public get selectedRiver(): string {
    return this._selectedRiver;
  }

  public set selectedRiver(selectedRiver: string) {
    this._selectedRiver = selectedRiver;
    this.selectedRiverChange.next(selectedRiver);
  }

  private setHighlightedRiverStyles(riverIds: number[], style: any) {
    for (const riverId of riverIds) {
      const riverLayer = this.getRiverLayer(riverId);
      if (riverLayer) {
        this.highlightedRivers.push(riverLayer);
        riverLayer.setStyle(style);
      }
    }
  }
}
