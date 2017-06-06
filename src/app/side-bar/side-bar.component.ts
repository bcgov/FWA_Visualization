import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import { TabsetComponent } from 'ngx-bootstrap/tabs';

import { RiverService } from '../river.service';

import { EmsStationService } from '../ems-station.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css']
})
export class SideBarComponent implements OnInit {

  @ViewChild('tabs') tabs: TabsetComponent;

  get river(): any {
    return this.riverService.selectedRiver;
  }

  get emsStation(): any {
    return this.emsStationService.selectedEmsStation;
  }

  constructor(private riverService: RiverService, private emsStationService: EmsStationService) {
    this.riverService.selectedRiverChange.subscribe((selectedRiver) => {
      this.tabs.tabs[1].disabled = false;
      this.tabs.tabs[1].active = true;
    });
    this.emsStationService.selectedEmsStationChange.subscribe((selectedRiver) => {
      this.tabs.tabs[2].disabled = false;
      this.tabs.tabs[2].active = true;
    });
  }

  ngOnInit() {
  }

}
