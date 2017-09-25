import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {RiverService} from './river.service';

export class RiverLocations {

  private change: Subject<any> = new Subject<any>();

  river: any;

  upstreamIds: number[] = [];

  downstreamIds: number[] = [];

  upstreamRivers: any[] = [];

  downstreamRivers: any[] = [];

  watershedCodes: string[] = [];

  get id(): string {
    if (this.river) {
      return this.river.feature.properties.id;
    } else {
      return null;
    }
  }

  get riverFeature(): string {
    if (this.river) {
      return this.river.feature;
    } else {
      return null;
    }
  }

  get watershedCode(): string {
    if (this.river) {
      return this.river.feature.properties.fwawsc;
    } else {
      return null;
    }
  }

  get riversLayer(): GeoJSON {
    return this.riverService.riversLayer;
  }

  constructor(
    private riverService: RiverService,
  ) {
  }

  public clear() {
    this.clearDo();
    this.change.next(null);
  }

  private clearDo() {
    if (this.river) {
      const river = this.river;
      this.river = null;
      const upstreamRivers = this.upstreamRivers.slice(0);
      this.upstreamRivers = [];
      const downstreamRivers = this.downstreamRivers.slice(0);
      this.downstreamRivers = [];
      this.downstreamIds = [];
      this.upstreamIds = [];
      this.watershedCodes = [];

      this.riversLayer.resetStyle(river);
      for (const upstreamRiver of upstreamRivers) {
        this.riversLayer.resetStyle(upstreamRiver);
      }
      for (const downstreamRiver of downstreamRivers) {
        this.riversLayer.resetStyle(downstreamRiver);
      }
    }
  }

  private setLocalWatershedCode(river: any) {
    const watershedCode = river.properties.fwawsc;
    if (!this.watershedCodes[watershedCode]) {
      this.watershedCodes[watershedCode] = river.properties.localwsc;
    }
  }

  public setRiver(riverLayer: any) {
    if (this.river !== riverLayer) {
      this.clearDo();
      if (riverLayer) {
        this.river = riverLayer;
        const river = riverLayer.feature;
        this.riversLayer.resetStyle(riverLayer);
        this.setLocalWatershedCode(river);
        this.upstreamIds = river.properties.a;
        this.setRiverRelations(this.upstreamRivers, this.upstreamIds, false);
        this.downstreamIds = river.properties.d;
        this.setRiverRelations(this.downstreamRivers, this.downstreamIds, true);
      }
      this.change.next(riverLayer);
    }
  }

  private setRiverRelations(
    selectedRivers: any[],
    riverIds: number[],
    downstream: boolean
  ) {
    for (const riverId of riverIds) {
      const riverLayer = this.riverService.getRiverLayer(riverId);
      if (riverLayer) {
        selectedRivers.push(riverLayer);
        if (downstream) {
          this.setLocalWatershedCode(riverLayer.feature);
        }
        this.riversLayer.resetStyle(riverLayer);
      }
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

}
