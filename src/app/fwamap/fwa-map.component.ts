import 'rxjs/add/operator/toPromise';
import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild
} from '@angular/core';
import {
  Http,
  Response
} from '@angular/http';

import {
  CircleMarker,
  GeoJSON,
  Map,
  Popup
} from 'leaflet';
import * as L from 'leaflet';
import {TiledMapLayer} from 'esri-leaflet';
import {MapService} from 'revolsys-angular-leaflet';
import {EmsStationService} from '../ems-station.service';
import {RiverService} from '../river.service';

@Component({
  selector: 'app-map',
  templateUrl: './fwa-map.component.html',
  styles: [`
:host {
  flex: 1;
  display:flex;
}

leaflet-map {
  flex: 1;
}
  `]
})
export class FwaMapComponent implements AfterViewInit {
  bcArcGisRestUrl = 'https://maps.gov.bc.ca/arcgis/rest/services';

  bcWmsUrl = 'https://openmaps.gov.bc.ca/geo/pub';

  constructor(
    private http: Http,
    private riverService: RiverService,
    private emsStationService: EmsStationService,
    private mapService: MapService
  ) {
  }

  ngAfterViewInit() {
    L.Icon.Default.imagePath = '/';
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });

    this.riverService.init();
    this.emsStationService.init();
    this.tempLayersInit();
  }

  private tempLayersInit() {
    this.mapService.withMap(map => {
      const location = [52.513437, -121.596309];
      const mtPolleyMarker = new CircleMarker(location, {
        title: 'Mt. Polley Mine',
        weight: 7
      }).addTo(map);
      mtPolleyMarker.bindPopup('Mt. Polley Mine').openPopup();
      map.setView(location, 10);
    });
  }
}

