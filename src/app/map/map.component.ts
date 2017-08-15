import 'rxjs/add/operator/toPromise';
import {
  Component,
  ElementRef,
  OnInit,
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

import {EmsStationService} from '../ems-station.service';
import {RiverService} from '../river.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  bcArcGisRestUrl = 'https://maps.gov.bc.ca/arcgis/rest/services';

  bcWmsUrl = 'https://openmaps.gov.bc.ca/geo/pub';

  @ViewChild('map') mapElement: ElementRef;

  layerControl: L.control;

  map: Map;

  constructor(
    private http: Http,
    private riverService: RiverService,
    private emsStationService: EmsStationService
  ) {
  }

  ngOnInit() {
    const map = this.map = new Map(this.mapElement.nativeElement, {
      minZoom: 1,
      maxZoom: 18,
      maxBounds: [
        [47.9, -140.1],
        [60.1, -113.9]
      ],
    });

    L.control.scale({
      imperial: false
    }).addTo(map);

    const boundsHandler = () => {
      map.setMinZoom(map.getBoundsZoom(map.options.maxBounds));
    };
    boundsHandler();
    map.on('resize', boundsHandler);
    map.fitWorld();

    this.baseLayersInit();
    this.riverService.init(this, this.map);
    this.emsStationService.init(this, this.map);
    this.tempLayersInit();
  }

  private baseLayersInit() {
    const map = this.map;

    /*-----BASE MAPS-----*/
    const provRoadsWM = new TiledMapLayer({
      url: this.bcArcGisRestUrl + '/province/roads_wm/MapServer',
      useCors: false
    });


    const provWebMercatorCache = new TiledMapLayer({
      url: this.bcArcGisRestUrl + '/province/web_mercator_cache/MapServer',
      useCors: false
    });

    /*-----POINTS OF DIVERSION-----*/
    const pointsOfDiversion = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP/ows', {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'Points_of_Diversion'
    });

    /*-----FWA WATERSHED GROUPS POLY-----*/
    const fwaWatershedGroups = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Watershed_Groups_Outlined'
    });

    /*-----FWA WATERSHED GROUPS LABELS-----*/
    const fwaWatershedGroupsLabels = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Watershed_Groups_Labels'
    });

    /*-----FWA WATERSHED GROUPS: LAYER GROUP-----*/
    const fwaWatershedGroups_LyrGrp = new L.layerGroup([fwaWatershedGroups, fwaWatershedGroupsLabels]);

    /*-----FWA ASSESSMENT WATERSHEDS-----*/
    const fwaAssessmentWatersheds = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Assessment_Watersheds_Outlined'
    });

    /*-----WATER RESOURCE MANAGMENT POINTS-----*/
    const wtrResourceMgmtPoints = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT/ows', {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'Protected_Rivers_Points'
    });

    provRoadsWM.addTo(map);
    provWebMercatorCache.addTo(map);
    pointsOfDiversion.addTo(map);
    fwaWatershedGroups.addTo(map);
    fwaWatershedGroupsLabels.addTo(map);
    fwaWatershedGroups_LyrGrp.addTo(map);
    wtrResourceMgmtPoints.addTo(map);

    /*-----Layer Control-----*/
    this.layerControl = L.control.layers({
      'Roads Base Map': provRoadsWM,
      'Terrain Base Map': provWebMercatorCache
    },
      {
        'Points of Diversion (Scale Dependent)': pointsOfDiversion,
        'FWA Watershed Groups (Scale Dependent)': fwaWatershedGroups_LyrGrp,
        'FWA Assessment Watersheds (Scale Dependent)': fwaAssessmentWatersheds
      },
      {
        collapsed: false
      }).addTo(map);
  }

  private tempLayersInit() {
    /*-----MT. POLLEY MINE MARKER-----*/
    const location = [52.513437, -121.596309];
    const mtPolleyMarker = new CircleMarker(location, {
      title: 'Mt. Polley Mine',
      weight: 7
    }).addTo(this.map);
    mtPolleyMarker.bindPopup('Mt. Polley Mine').openPopup();
    this.map.setView(location, 10);
  }

  public loadJson(layer: GeoJSON, file: string) {
    this.http.get(file).toPromise().then(response => {
      layer.clearLayers();
      const json = response.json();
      layer.addData(json);
    });
  }
}

