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
      const riverWatershedCode = properties.wsc;
      if (this.watershedCode.equalsMajor(riverWatershedCode)) {
        const riverWatershedCodeLocalMin = properties.minlwsc;
        let riverWatershedCodeLocalMax = properties.maxlwsc;
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
    const watershedCode = river.properties.wsc;
    if (!this.localWatershedCodeByWatershedCode[watershedCode]) {
      this.localWatershedCodeByWatershedCode[watershedCode] = river.properties.minlwsc;
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
        this.watershedCode = properties.wsc;
        this.watershedCodeLocalMin = properties.minlwsc;
        this.watershedCodeLocalMax = properties.maxlwsc;
        this.setLocalWatershedCode(river);
      }
      this.riverService.resetStyles();
      this.change.next(riverLayer);
    }
    if (riverLayer && this.riverService.riverSource == 1) {
      const id = river['properties']['id'];
      this.riverService.mapService.getWfsFeatures(
        'https://openmaps.gov.bc.ca/geo/pub/WHSE_BASEMAPPING.FWA_STREAM_NETWORKS_SP/wfs',
        'WHSE_BASEMAPPING.FWA_STREAM_NETWORKS_SP', {
          cql_filter: `LINEAR_FEATURE_ID=${riverLayer.feature['properties']['id']}`
        }, results => {
          const result = results['features'][0];
          if (result && this.river == riverLayer) {
            Object.assign(properties, result['properties']);
          }
        });
    }
  }


  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

}
