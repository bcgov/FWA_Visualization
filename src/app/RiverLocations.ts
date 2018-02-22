import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {RiverService} from './river.service';
import {WatershedCode} from './WatershedCode';

export class RiverLocations {

  private change: Subject<any> = new Subject<any>();

  localWatershedCodeByWatershedCode: {[id: string]: string} = {};

  river: any;

  upstreamIds: number[] = [];

  upstreamRivers: any[] = [];

  watershedCode: WatershedCode;

  watershedCodeLocalMin: WatershedCode;

  watershedCodeLocalMax: WatershedCode;

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
    if (this.watershedCode) {
      const properties = river.properties;
      const riverWatershedCode = properties['FWA_WATERSHED_CODE'];
      if (this.watershedCode.equalsMajor(riverWatershedCode)) {
        const riverWatershedCodeLocalMin = properties['MIN_LOCAL_WATERSHED_CODE'];
        let riverWatershedCodeLocalMax = properties['MAX_LOCAL_WATERSHED_CODE'];
        if (this.watershedCode.equals(riverWatershedCode)) {
          if (riverWatershedCodeLocalMax.code < this.watershedCodeLocalMin.code) {
            if (!riverWatershedCode.equals(riverWatershedCodeLocalMax)) {
              return -1;
            }
          } else if (riverWatershedCodeLocalMin.code > this.watershedCodeLocalMax.code) {
            if (!riverWatershedCode.equals(riverWatershedCodeLocalMax)) {
              return 1;
            }
          } else {
            return 0;
          }
        } else if (this.watershedCode.ascestorOf(riverWatershedCode)) {
          if (this.watershedCodeLocalMax < riverWatershedCodeLocalMin) {
            return 1;
          }
        } else if (this.watershedCode.descendentOf(riverWatershedCode)) {
          // TODO case where sub stream comes in lower down than main streem
          if (this.watershedCode.greaterThan(riverWatershedCode, riverWatershedCodeLocalMax)) {
            return -1;
          }
        }
      }
    }
    return null;
  }

  public clear() {
    this.clearDo();
    this.riverService.resetStyles();
    this.change.next(null);
  }

  private clearDo() {
    if (this.river) {
      const river = this.river;
      this.localWatershedCodeByWatershedCode = {};
      this.river = null;
      this.upstreamIds = [];
      this.upstreamRivers = [];
      this.watershedCode = null;
      this.watershedCodeLocalMin = null;
      this.watershedCodeLocalMax = null;
    }
  }

  private setLocalWatershedCode(river: any) {
    const watershedCode = river.properties['FWA_WATERSHED_CODE'];
    if (!this.localWatershedCodeByWatershedCode[watershedCode]) {
      this.localWatershedCodeByWatershedCode[watershedCode] = river.properties['MIN_LOCAL_WATERSHED_CODE'];
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
        this.watershedCode = properties['FWA_WATERSHED_CODE'];
        if (this.watershedCode.code.startsWith('999')) {
          this.watershedCode = null;
        }
        this.watershedCodeLocalMin = properties['MIN_LOCAL_WATERSHED_CODE'];
        this.watershedCodeLocalMax = properties['MAX_LOCAL_WATERSHED_CODE'];
        this.setLocalWatershedCode(river);
      }
      this.riverService.resetStyles();
      this.change.next(riverLayer);
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

}
