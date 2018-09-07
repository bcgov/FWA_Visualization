import 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/images/marker-icon.png';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClientModule, HttpClientJsonpModule} from '@angular/common/http';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from "./app.component";

import {RevolsysAngularBcgovPageModule} from 'revolsys-angular-bcgov-page';

import {MatTabsModule} from '@angular/material/tabs';
import {GeographicNameSearchComponent} from './geographic-name-search.component';
import {EmsStationService} from './ems-station.service';
import {RiverService} from './river.service';
import {FwaMapComponent} from './fwamap/fwa-map.component';
import {FwaLegendComponent} from './fwamap/fwa-legend.component';
import {GnisNameService} from "./gnis-name.service";
import {
  MapService,
  RevolsysAngularLeafletModule
} from 'revolsys-angular-leaflet';
import {LayoutComponent} from './layout/layout.component';
import {SideBarComponent} from './side-bar/side-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    FwaMapComponent,
    FwaLegendComponent,
    LayoutComponent,
    SideBarComponent,
    GeographicNameSearchComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    HttpClientJsonpModule,

    AppRoutingModule,

    MatTabsModule,
    RevolsysAngularBcgovPageModule.forRoot({
      basePath: '/',
      title: 'FWA Streams and EMS Stations',
      fullWidthContent: true
    }),
    RevolsysAngularLeafletModule

  ],
  providers: [
    MapService,
    EmsStationService,
    GnisNameService,
    RiverService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
