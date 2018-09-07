import {Subject} from 'rxjs';
import {GeoJSON} from 'leaflet';
import {RiverService} from './river.service';
import {WatershedCode} from './WatershedCode';
import {WatershedCodeRange} from "./WatershedCodeRange";

export class RiverLocations {

  private change: Subject<any> = new Subject<any>();

  river: any;

  upstreamIds: number[] = [];

  upstreamRivers: any[] = [];

  watershedCodeRange: WatershedCodeRange;

  get id(): string {
    if (this.river) {
      return this.river.feature.properties['LINEAR_FEATURE_ID'];
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

  get riversLayer(): GeoJSON {
    return this.riverService.riversLayer;
  }

  constructor(
    private riverService: RiverService,
  ) {
  }

  /*
   * 0 On stream
   * -1 Downstream
   * 1 Upstream 
   */
  getRiverLocation(river: any): number {
    if (this.watershedCodeRange) {
      const properties = river.properties;
      return this.watershedCodeRange.getLocation(river.properties['codeRange']);
    } else {
      return null;
    }
  }

  public clear() {
    this.clearDo();
    this.riverService.resetStyles();
    this.change.next(null);
  }

  private clearDo() {
    if (this.river) {
      const river = this.river;
      this.river = null;
      this.upstreamIds = [];
      this.upstreamRivers = [];
      this.watershedCodeRange = null;
    }
  }

  public setRiver(riverLayer: any) {
    let river;
    let properties;
    if (this.river !== riverLayer) {
      this.clearDo();
      if (riverLayer) {
        this.river = riverLayer;
        river = riverLayer.feature;
        properties = river.properties;
        this.watershedCodeRange = properties['codeRange'];
        if (this.watershedCodeRange.code.code.startsWith('999')) {
          this.watershedCodeRange = null;
        }
      }
      this.riverService.resetStyles();
      this.change.next(riverLayer);
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

}
