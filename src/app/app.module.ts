import 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/images/marker-icon.png';
import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClientModule, HttpClientJsonpModule} from '@angular/common/http';
import {AppRoutingModule} from './app-routing.module';

import {BcgovPageModule} from 'revolsys-bcgov-angular-page';

import {TabsModule} from 'ngx-bootstrap/tabs';
import {TypeaheadModule} from 'ngx-bootstrap/typeahead';

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
    FwaMapComponent,
    FwaLegendComponent,
    LayoutComponent,
    SideBarComponent,
    GeographicNameSearchComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    HttpClientJsonpModule,

    AppRoutingModule,

    TabsModule.forRoot(),
    TypeaheadModule.forRoot(),
    BcgovPageModule.forRoot({
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
  bootstrap: [LayoutComponent]
})
export class AppModule {}
