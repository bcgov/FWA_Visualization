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

import { Map } from 'leaflet';
import * as L from 'leaflet';
import { TiledMapLayer } from 'esri-leaflet';

@Component({
  selector: 'fwa-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  bcArcGisRestUrl = 'https://maps.gov.bc.ca/arcgis/rest/services';

  bcWmsUrl = 'https://openmaps.gov.bc.ca/geo/pub';
  
  @ViewChild('map') mapElement: ElementRef;

  /*-----BASE MAPS-----*/
  private provRoadsWM = new TiledMapLayer({
    url: this.bcArcGisRestUrl + '/province/roads_wm/MapServer',
    useCors: false
  });
  
  
  private provWebMercatorCache = new TiledMapLayer({
    url: this.bcArcGisRestUrl + '/province/web_mercator_cache/MapServer',
    useCors: false
  });

  /*-----POINTS OF DIVERSION-----*/  
  private pointsOfDiversion = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP/ows', {
    layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
    styles: 'Points_of_Diversion'
  });
  
  /*-----FWA WATERSHED GROUPS POLY-----*/  
  private fwaWatershedGroups = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
    layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
    styles: 'FWA_Watershed_Groups_Outlined'
  });
  
  /*-----FWA WATERSHED GROUPS LABELS-----*/  
  private fwaWatershedGroupsLabels = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
    layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
    styles: 'FWA_Watershed_Groups_Labels'
  });
  
  /*-----FWA WATERSHED GROUPS: LAYER GROUP-----*/
  private fwaWatershedGroups_LyrGrp = new L.layerGroup([this.fwaWatershedGroups, this.fwaWatershedGroupsLabels]);
      
  /*-----FWA ASSESSMENT WATERSHEDS-----*/  
  private fwaAssessmentWatersheds = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY/ows', {
    layers: 'pub:WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
    styles: 'FWA_Assessment_Watersheds_Outlined'
  });
  
  /*-----WATER RESOURCE MANAGMENT POINTS-----*/  
  wtrResourceMgmtPoints = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT/ows', {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT',
        format: 'image/png',
        transparent: true,
        attribution: '© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'Protected_Rivers_Points'
  });
  
  highlightedRiver : any;
  
  rivers :any;
  
  map : Map;
  
  constructor(
    private http : Http
  ) {
  }

  ngOnInit() {
    let map = this.map = new Map(this.mapElement.nativeElement, {
      minZoom: 1,
      maxZoom: 18,
      maxBounds: [
        [47.9, -140.1],
        [60.1, -113.9]
      ],
    });
    let boundsHandler = ()=> {
      map.setMinZoom( map.getBoundsZoom( map.options.maxBounds ) );
    };
    boundsHandler();
    map.on('resize', boundsHandler);
    map.fitWorld();

    this.provRoadsWM.addTo(map);
    this.provWebMercatorCache.addTo(map);
    this.pointsOfDiversion.addTo(map);
    this.fwaWatershedGroups.addTo(map);
    this.fwaWatershedGroupsLabels.addTo(map);
    this.fwaWatershedGroups_LyrGrp.addTo(map);
    this.wtrResourceMgmtPoints.addTo(map);
    
    this.riverInit();
    

    /*-----Layer Control-----*/
    var layerControl = L.control.layers({
        'Roads Base Map': this.provRoadsWM,
        'Terrain Base Map': this.provWebMercatorCache
    },
    {
      'Points of Diversion (Scale Dependent)': this.pointsOfDiversion,
      'FWA Watershed Groups (Scale Dependent)': this.fwaWatershedGroups_LyrGrp,
      'FWA Assessment Watersheds (Scale Dependent)': this.fwaAssessmentWatersheds
    },
    {
      collapsed: false  
    }).addTo(map);
  }

  private riverInit() {
    const self = this;
    this.rivers = L.geoJson([], {
      style: this.riverStyle.bind(this),
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: this.riverMouseOver.bind(this),
          mouseout: this.riverMouseOut.bind(this)
        });
      }
    });
    this.http.get('assets/FWA_BC_200M.geojson').toPromise().then(response => {
      const json = response.json();
      this.rivers.addData(json);
    });
    this.rivers.addTo(this.map);
  }

  private riverStyle(river) {
    var color = "#000000";
    var weight = 1;
    const highlightedRiver = this.highlightedRiver;
    if (highlightedRiver) {
      var riverId = river.properties.id;
      var highlightedRiverId = highlightedRiver.properties.id;
      if (highlightedRiverId == riverId) {
        color = "#00FFFF";
        weight = 10;
      }
      else {
        var highlightedRiverDescendentIds = highlightedRiver.properties.d;
        if (highlightedRiverDescendentIds && highlightedRiverDescendentIds.includes(riverId)) {
          color = "#FF0000";
          weight = 5;
        } else {
          var highlightedRiverAncestorsIds = highlightedRiver.properties.a;
          if (highlightedRiverAncestorsIds && highlightedRiverAncestorsIds.includes(riverId)) {
            color = "#00FF00";
            weight = 5;
          }
        }
      }
    }
    return {
      color: color,
      weight: weight
    };
  }

  private riverMouseOver(e) {
    var layer = e.target;
    if (this.rivers) {
      var river = layer.feature;
      if (river) {
        this.highlightedRiver = river;
      } else {
        this.highlightedRiver = undefined;
      }
      this.rivers.setStyle(this.riverStyle.bind(this));
    }
  }

  private riverMouseOut(e) {
    this.highlightedRiver = undefined;
    if (this.rivers) {
      this.rivers.setStyle(this.riverStyle.bind(this));
    }
  }
}
