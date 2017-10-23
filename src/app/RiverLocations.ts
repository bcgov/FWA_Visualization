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
      if (this.riverService.riverSource === 1) {
        const riverId = properties.id;
        if (this.id === riverId) {
          return 0;
        } else if (this.upstreamIds.indexOf(riverId) !== -1) {
          return 1;
        } else if (this.downstreamIds.indexOf(riverId) !== -1) {
          return -1;
        }
      } else {
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
      const downstreamRivers = this.downstreamRivers.slice(0);
      const upstreamRivers = this.upstreamRivers.slice(0);
      this.downstreamIds = [];
      this.downstreamRivers = [];
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
    if (this.river !== riverLayer) {
      this.clearDo();
      if (riverLayer) {
        this.river = riverLayer;
        const river = riverLayer.feature;
        this.watershedCode = river.properties.fwawsc;
        this.watershedCodeLocal = river.properties.localwsc;

        this.setLocalWatershedCode(river);
        if (this.riverService.riverSource === 1) {
          this.upstreamIds = river.properties.a;
          this.setRiverRelations(this.upstreamRivers, this.upstreamIds, false);
          this.downstreamIds = river.properties.d;
          this.setRiverRelations(this.downstreamRivers, this.downstreamIds, true);
        }
      }
      this.riverService.resetStyles();
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
      }
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

}
