import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import { TabsetComponent } from 'ngx-bootstrap/tabs';

import { RiverService } from '../river.service';

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

  constructor(private riverService: RiverService) {
    this.riverService.selectedRiverChange.subscribe((selectedRiver) => {
      this.tabs.tabs[1].disabled = false;
      this.tabs.tabs[1].active = true;
    });
  }

  ngOnInit() {
  }

}
