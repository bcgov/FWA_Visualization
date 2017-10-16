import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {EmsStationService} from './ems-station.service';
import {RiverLocations} from './RiverLocations';

export class EmsStationLocations {

  private change: Subject<any> = new Subject<any>();

  downstreamIds: string[] = [];

  onStreamIds: string[] = [];


  get stationsLayer(): GeoJSON {
    return this.emsStationService.emsStationsLayer;
  }

  constructor(
    private emsStationService: EmsStationService,
    private riverLocations: RiverLocations
  ) {
  }

  public clear() {
    this.clearDo();
    this.change.next(null);
  }

  private clearDo() {
    const onStreamIds = this.onStreamIds.slice(0);
    this.onStreamIds = [];

    const downstreamIds = this.downstreamIds.slice(0);
    this.downstreamIds = [];

    for (const ids of [onStreamIds, downstreamIds]) {
      for (const emsStationId of ids) {
        const layer = this.emsStationService.emsStationLayerById[emsStationId];
        if (layer) {
          this.emsStationService.setStyle(layer);
        }
      }
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

  stationIds(): any[] {
    if (this.onStreamIds.length === 0) {
      return this.downstreamIds;
    } else {
      return this.onStreamIds.concat(this.downstreamIds);
    }
  }

  onStream(emsStationId: string) {
    return this.onStreamIds.indexOf(emsStationId) !== -1;
  }

  downstream(emsStationId: string) {
    return this.downstreamIds.indexOf(emsStationId) !== -1;
  }

  stationCount(): number {
    return this.onStreamIds.length + this.downstreamIds.length;
  }

  setEmsStationsForRiver(river: any) {
    this.clearDo();
    if (river) {
      const riverWatershedCode = river.feature.properties.fwawsc;
      const riverLocalWatershedCode = river.feature.properties.localwsc;
      const watershedCodes = this.riverLocations.watershedCodes;
      for (const highlightedWatershedCode of Object.keys(watershedCodes)) {
        const highlightedLocalWatershedCode = watershedCodes[highlightedWatershedCode];
        const emsStationIds = this.emsStationService.emsStationIdsByWatershedCode[highlightedWatershedCode];
        if (emsStationIds) {
          for (const emsStationId of emsStationIds) {
            const stationLocalWatershedCode = this.emsStationService.localWatershedCodeById[emsStationId];
            if (highlightedWatershedCode === riverWatershedCode && stationLocalWatershedCode === riverLocalWatershedCode) {
              this.onStreamIds.push(emsStationId);
            } else if (highlightedWatershedCode <= riverWatershedCode && stationLocalWatershedCode < riverLocalWatershedCode) {
              this.downstreamIds.push(emsStationId);
            }
            const layer = this.emsStationService.emsStationLayerById[emsStationId];
            if (layer) {
              layer.bringToFront();
              this.emsStationService.setStyle(layer);
            }
          }
        }
      }
    }
  }

}
