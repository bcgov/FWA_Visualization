import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import {TabsetComponent} from 'ngx-bootstrap/tabs';

import {RiverService} from '../river.service';

import {EmsStationService} from '../ems-station.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {

  @ViewChild('tabs') tabs: TabsetComponent;

  constructor(
    public riverService: RiverService,
    private emsStationService: EmsStationService
  ) {
    this.riverService.selectedRiverLocations.subscribe((selectedRiver) => {
      this.tabs.tabs[1].disabled = selectedRiver === null;
      if (selectedRiver == null) {
        this.tabs.tabs[0].active = true;
      } else {
        this.tabs.tabs[1].active = true;
      }
    });
    this.emsStationService.selectedEmsStationChange.subscribe((selectedEmsStation) => {
      this.tabs.tabs[2].disabled = selectedEmsStation === null;
      if (selectedEmsStation == null) {
        this.tabs.tabs[0].active = true;
      } else {
        this.tabs.tabs[2].active = true;
      }
    });
  }

  get river(): any {
    return this.riverService.selectedRiverLocations.riverFeature;
  }

  get emsStation(): any {
    return this.emsStationService.selectedEmsStation;
  }

  get emsStationId(): string {
    const emsStation = this.emsStation;
    if (emsStation) {
      return emsStation.properties['MONITORING_LOCATION_ID'];
    }
  }

  emsStationName(emsStationId: string): string {
    return this.emsStationService.nameById[emsStationId];
  }

  emsStationWatershedCode(emsStationId: string): string {
    return this.emsStationService.watershedCodeById[emsStationId];
  }

  emsStationLocalWatershedCode(emsStationId: string): string {
    return this.emsStationService.localWatershedCodeById[emsStationId];
  }

  get emsLocations(): any {
    return this.emsStationService.selectedEmsStationLocations;
  }

  ngOnInit() {
  }

  km(length: number): string {
    return (length / 1000).toFixed(1) + ' km';
  }

  localCode(): string {
    const min = this.river.properties.MIN_LOCAL_WATERSHED_CODE;
    const max = this.river.properties.MAX_LOCAL_WATERSHED_CODE;
    if (min.equals(max)) {
      return min.toString().replace(/-000000$/, '');
    } else {
      const base = min.base(max);
      if (base == null) {
        return min + '\n' + max;
      } else {
        const minSuffix = base.suffix(min);
        const maxSuffix = base.suffix(max);
        return `${base}-(${minSuffix}:${maxSuffix})`;
      }
    }
  }
}
