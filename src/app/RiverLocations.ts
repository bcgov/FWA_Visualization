import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {RiverService} from './river.service';

export class RiverLocations {

  private change: Subject<any> = new Subject<any>();

  downstreamIds: number[] = [];

  downstreamRivers: any[] = [];

  localWatershedCodeByWatershedCode: {[id: string]: string} = {};

  river: any;

  upstreamIds: number[] = [];

  upstreamRivers: any[] = [];

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
      const downstreamRivers = this.downstreamRivers.slice(0);
      const upstreamRivers = this.upstreamRivers.slice(0);
      this.downstreamIds = [];
      this.downstreamRivers = [];
      this.localWatershedCodeByWatershedCode = {};
      this.river = null;
      this.upstreamIds = [];
      this.upstreamRivers = [];
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
    if (!this.localWatershedCodeByWatershedCode[watershedCode]) {
      this.localWatershedCodeByWatershedCode[watershedCode] = river.properties.localwsc;
    }
  }

  public setRiver(riverLayer: any) {
    if (this.river !== riverLayer) {
      this.clearDo();
      if (riverLayer) {
        this.river = riverLayer;
        const river = riverLayer.feature;
        this.riversLayer.resetStyle(riverLayer);
        let watershedCode = river.properties.fwawsc;
        for (let index = watershedCode.lastIndexOf('-'); index !== -1; index = watershedCode.lastIndexOf('-')) {
          this.watershedCodes.push(watershedCode);
          watershedCode = watershedCode.substring(0, index);
        }
        this.watershedCodes.push(watershedCode);
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
