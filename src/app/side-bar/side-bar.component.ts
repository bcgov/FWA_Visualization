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

  constructor(private riverService: RiverService, private emsStationService: EmsStationService) {
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

  emsStationId(emsStation: any): string {
    return emsStation.properties['MONITORING_LOCATION_ID'];
  }

  emsStationName(emsStationId: any): string {
    return this.emsStationService.nameById[emsStationId];
  }

  emsStationWatershedCode(emsStation: any): string {
    const id = this.emsStationId(emsStation);
    return this.emsStationService.watershedCodeById[id];
  }

  get emsLocations(): any {
    return this.emsStationService.selectedEmsStationLocations;
  }

  ngOnInit() {
  }

}
