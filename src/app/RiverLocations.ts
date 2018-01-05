import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {RiverService} from './river.service';

export class RiverLocations {

  private change: Subject<any> = new Subject<any>();

  localWatershedCodeByWatershedCode: {[id: string]: string} = {};

  river: any;

  upstreamIds: number[] = [];

  upstreamRivers: any[] = [];

  watershedCode = '';

  watershedCodeLocal = '';

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

  getRiverLocation(river: any): number {
    if (this.watershedCode) {
      const properties = river.properties;
      const riverWatershedCode = properties.fwawsc;
      const riverWatershedCodeLocal = properties.localwsc;
      if (this.watershedCode === riverWatershedCode) {
        if (riverWatershedCodeLocal === this.watershedCodeLocal) {
          return 0;
        } else if (riverWatershedCodeLocal < this.watershedCodeLocal) {
          return -1;
        } else {
          return 1;
        }
      } else if (this.watershedCode.startsWith(riverWatershedCode + '-')) {
        if (riverWatershedCodeLocal < this.watershedCodeLocal) {
          return -1;
        }
      } else if (riverWatershedCode <= this.watershedCodeLocal || riverWatershedCode.startsWith(this.watershedCodeLocal + '-')) {
      } else {
        if (riverWatershedCode.startsWith(this.watershedCode + '-') && riverWatershedCodeLocal > this.watershedCodeLocal) {
          return 1;
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
      this.watershedCode = '';
      this.watershedCodeLocal = '';
    }
  }

  private setLocalWatershedCode(river: any) {
    const watershedCode = river.properties.fwawsc;
    if (!this.localWatershedCodeByWatershedCode[watershedCode]) {
      this.localWatershedCodeByWatershedCode[watershedCode] = river.properties.localwsc;
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
        this.watershedCode = properties.fwawsc;
        this.watershedCodeLocal = properties.localwsc;

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
