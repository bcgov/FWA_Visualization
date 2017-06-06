import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { TabsModule } from 'ngx-bootstrap/tabs';

import { EmsStationService } from './ems-station.service';
import { RiverService } from './river.service';
import { MapComponent } from './map/map.component';
import { LayoutComponent } from './layout/layout.component';
import { SideBarComponent } from './side-bar/side-bar.component';

@NgModule({
  declarations: [
    MapComponent,
    LayoutComponent,
    SideBarComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,

    TabsModule.forRoot()
  ],
  providers: [
    EmsStationService,
    RiverService
  ],
  bootstrap: [LayoutComponent]
})
export class AppModule { }
