import {Subject} from 'rxjs/Subject';
import {GeoJSON} from 'leaflet';
import {EmsStationService} from './ems-station.service';
import {RiverLocations} from './RiverLocations';

export class EmsStationLocations {

  private change: Subject<any> = new Subject<any>();

  downstreamIds: string[] = [];

  downstreamStations: any[] = [];

  onStreamIds: string[] = [];

  onStreamStations: any[] = [];


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
    const onStreamStations = this.onStreamStations.slice(0);
    this.onStreamStations = [];
    this.onStreamIds = [];

    const downstreamStations = this.downstreamStations.slice(0);
    this.downstreamStations = [];
    this.downstreamIds = [];

    for (const downstreamStation of downstreamStations) {
      this.emsStationService.setStyle(downstreamStation);
    }

    for (const onStreamStation of onStreamStations) {
      this.emsStationService.setStyle(onStreamStation);
    }
  }

  subscribe(callback: (value: any) => void) {
    this.change.subscribe(callback);
  }

  stations(): any[] {
    if (this.onStreamStations.length === 0) {
      return this.downstreamStations;
    } else {
      return this.onStreamStations.concat(this.downstreamStations);
    }
  }

  onStream(station: any) {
    const stationId = station.feature.properties['MONITORING_LOCATION_ID'];
    return this.onStreamIds.indexOf(stationId) !== -1;
  }

  downstream(station: any) {
    const stationId = station.feature.properties['MONITORING_LOCATION_ID'];
    return this.downstreamIds.indexOf(stationId) !== -1;
  }

  stationCount(): number {
    return this.onStreamStations.length + this.downstreamStations.length;
  }

  setEmsStationsForRiver(river: any) {
    this.clearDo();
    if (river) {
      const riverWatershedCode = river.feature.properties.fwawsc;
      const riverLocalWatershedCode = river.feature.properties.localwsc;
      const watershedCodes = this.riverLocations.watershedCodes;
      for (const highlightedWatershedCode of Object.keys(watershedCodes)) {
        const highlightedLocalWatershedCode = watershedCodes[highlightedWatershedCode];
        const stations = this.emsStationService.emsStationLayersByWatershedCode[highlightedWatershedCode];
        if (stations) {
          for (const station of stations) {
            const id = station.feature.properties['MONITORING_LOCATION_ID'];
            const stationLocalWatershedCode = station.feature.properties.LOCAL_WATERSHED_CODE;
            if (highlightedWatershedCode === riverWatershedCode && stationLocalWatershedCode === riverLocalWatershedCode) {
              this.onStreamIds.push(id);
              this.onStreamStations.push(station);
            } else if (highlightedWatershedCode <= riverWatershedCode && stationLocalWatershedCode < riverLocalWatershedCode) {
              this.downstreamIds.push(id);
              this.downstreamStations.push(station);
            }
            station.bringToFront();
            this.emsStationService.setStyle(station);
          }
        }
      }
    }
  }

}
