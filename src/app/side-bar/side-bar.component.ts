import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import {RiverService} from '../river.service';

import {EmsStationService} from '../ems-station.service';
import {MatTab} from "@angular/material/tabs";

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {

  @ViewChild('tabHelp') tabHelp: MatTab;

  @ViewChild('tabRiver') tabRiver: MatTab;

  @ViewChild('tabEmsStation') tabEmsStation: MatTab;

  constructor(
    public riverService: RiverService,
    private emsStationService: EmsStationService
  ) {
    this.riverService.selectedRiverLocations.subscribe((selectedRiver) => {
      this.tabRiver.disabled = selectedRiver === null;
      if (selectedRiver == null) {
        this.tabHelp.isActive = true;
      } else {
        this.tabRiver.isActive = true;
      }
    });
    this.emsStationService.selectedEmsStationChange.subscribe((selectedEmsStation) => {
      this.tabEmsStation.disabled = selectedEmsStation === null;
      if (selectedEmsStation == null) {
        this.tabHelp.isActive = true;
      } else {
        this.tabEmsStation.isActive = true;
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
}
