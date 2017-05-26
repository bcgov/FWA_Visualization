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
import { TiledMapLayer } from 'esri-leaflet';

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

  highlightedRiver: any;

  riverLayer: GeoJSON;

  riverPopup: Popup;

  riverSource = 0;

  highlightedEmsStation: any;

  emsStationLayer: GeoJSON;

  emsStationPopup: Popup;

  emsStationSource = 0;

  map: Map;

  constructor(
    private http: Http
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
    this.riverInit();
    this.emsStationInit();
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
      attribution: 'Â© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'Points_of_Diversion'
    });

    /*-----FWA WATERSHED GROUPS POLY-----*/
    const fwaWatershedGroups = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: 'Â© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Watershed_Groups_Outlined'
    });

    /*-----FWA WATERSHED GROUPS LABELS-----*/
    const fwaWatershedGroupsLabels = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: 'Â© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Watershed_Groups_Labels'
    });

    /*-----FWA WATERSHED GROUPS: LAYER GROUP-----*/
    const fwaWatershedGroups_LyrGrp = new L.layerGroup([fwaWatershedGroups, fwaWatershedGroupsLabels]);

    /*-----FWA ASSESSMENT WATERSHEDS-----*/
    const fwaAssessmentWatersheds = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY/ows', {
      layers: 'pub:WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY',
      format: 'image/png',
      transparent: true,
      attribution: 'Â© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
      styles: 'FWA_Assessment_Watersheds_Outlined'
    });

    /*-----WATER RESOURCE MANAGMENT POINTS-----*/
    const wtrResourceMgmtPoints = new L.tileLayer.wms(this.bcWmsUrl + '/WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT/ows', {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT',
      format: 'image/png',
      transparent: true,
      attribution: 'Â© 2013-2016 GeoBC, DataBC, The Province of British Columbia',
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

  private riverInit() {
    this.riverLayer = L.geoJson([], {
      style: this.riverStyle.bind(this),
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: this.riverMouseOver.bind(this),
          mouseout: this.riverMouseOut.bind(this),
          click: this.riverClick.bind(this)
        });
      }
    })
      .addTo(this.map)
      ;
    this.layerControl.addOverlay(this.riverLayer, 'FWA Stream Network');
    const loadHandler = (e) => {
      const zoom = this.map.getZoom();
      if (zoom >= 10) {
        if (this.riverSource !== 1) {
          this.loadJson(this.riverLayer, 'assets/QUES_2O_NET10M.geojson');
          this.riverSource = 1;
        }
      } else if (zoom <= 9) {
        if (this.riverSource !== 2) {
          this.loadJson(this.riverLayer, 'assets/FWA_BC_200M.geojson');
          this.riverSource = 2;
        }
      }
    };
    this.map.on('zoomend', loadHandler.bind(this));
    loadHandler(null);
  }

  private riverStyle(river) {
    let color = '#000000';
    let weight = 1;
    const highlightedRiver = this.highlightedRiver;
    if (highlightedRiver) {
      const riverId = river.properties.id;
      const highlightedRiverId = highlightedRiver.properties.id;
      if (highlightedRiverId === riverId) {
        color = '#00FFFF';
        weight = 10;
      } else {
        const highlightedRiverDescendentIds = highlightedRiver.properties.d;
        if (highlightedRiverDescendentIds && highlightedRiverDescendentIds.includes(riverId)) {
          color = '#FF0000';
          weight = 5;
        } else {
          const highlightedRiverAncestorsIds = highlightedRiver.properties.a;
          if (highlightedRiverAncestorsIds && highlightedRiverAncestorsIds.includes(riverId)) {
            color = '#00FF00';
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
    const layer = e.target;
    if (this.riverLayer) {
      const river = layer.feature;
      if (river) {
        this.highlightedRiver = river;
      } else {
        this.highlightedRiver = undefined;
      }
      this.riverLayer.setStyle(this.riverLayer.options.style);
    }
  }

  private riverMouseOut(e) {
    this.highlightedRiver = undefined;
    if (this.riverLayer) {
      this.riverLayer.setStyle(this.riverLayer.options.style);
    }
    if (this.riverPopup) {
      this.map.removeLayer(this.riverPopup);
      this.riverPopup = null;
    }
  }

  private riverClick(e) {
    const layer = e.target;
    const river = layer.feature;
    if (river) {
      const latlng = layer.getBounds().getCenter();

      this.riverPopup = new Popup({
        offset: [10, -10],
        closeButton: false
      })
        .setLatLng(latlng)
        .setContent('<b>' + String(river.properties.name) + '</b>' + '<br>Segment length: ' + (river.properties.seglen / 1000).toFixed(1) + ' km' + '<br>Upstream length: ' + (river.properties.upslen / 1000).toFixed(1) + ' km' + '<br>Downstream length: ' + (river.properties.dwnslen / 1000).toFixed(1) + ' km')
        .addTo(this.map)
        ;
    }
  }

  private emsStationInit() {
    this.emsStationLayer = L.geoJson([], {
      pointToLayer: function(feature, latlng) {
        return new CircleMarker(latlng, {
          radius: 6,
          fillColor: '#ff7800',
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: (feature, layer) => {
        layer.on({
          mouseover: this.emsStationMouseOver.bind(this),
          mouseout: this.emsStationMouseOut.bind(this),
          click: this.emsStationClick.bind(this)
        });
      }
    })
      .addTo(this.map)
      ;
    this.layerControl.addOverlay(this.emsStationLayer, 'Environmental Monitoring System Station');
    const loadHandler = (e) => {
      const zoom = this.map.getZoom();
      if (zoom >= 10) {
        if (this.emsStationSource !== 1) {
          this.loadJson(this.emsStationLayer, 'assets/EMS_Monitoring_Locations_QUES.geojson');
          this.emsStationSource = 1;
        }
      } else if (zoom <= 9) {
        if (this.emsStationSource !== 2) {
          this.emsStationLayer.clearLayers();
          this.emsStationSource = 2;
        }
      }
    };
    this.map.on('zoomend', loadHandler.bind(this));
    loadHandler(null);
  }

  private emsStationStyle(emsStation) {
    let color = '#000000';
    let weight = 1;
    const highlightedEmsStation = this.highlightedEmsStation;
    if (highlightedEmsStation) {
      const emsStation_Id = emsStation.properties.MONITORING_LOCATION_ID;
      const highlightedEmsStationId = highlightedEmsStation.properties.MONITORING_LOCATION_ID;
      if (highlightedEmsStationId === emsStation_Id) {
        color = '#00FFFF';
        weight = 10;
      } else {
        const highlightedEmsStationDescendentIds = highlightedEmsStation.properties.d;
        if (highlightedEmsStationDescendentIds && highlightedEmsStationDescendentIds.includes(emsStation_Id)) {
          color = '#FF0000';
          weight = 5;
        } else {
          const highlightedEmsStationAncestorsIds = highlightedEmsStation.properties.a;
          if (highlightedEmsStationAncestorsIds && highlightedEmsStationAncestorsIds.includes(emsStation_Id)) {
            color = '#00FF00';
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

  private emsStationMouseOver(e) {
    const layer = e.target;
    const emsStation = layer.feature;
    if (emsStation) {
      this.highlightedEmsStation = emsStation;
    } else {
      this.highlightedEmsStation = undefined;
    }
    this.emsStationLayer.setStyle(this.emsStationStyle.bind(this));
  }

  private emsStationMouseOut(e) {
    this.highlightedEmsStation = undefined;
    this.emsStationLayer.setStyle(this.emsStationStyle.bind(this));
    if (this.emsStationPopup) {
      this.map.removeLayer(this.emsStationPopup);
      this.emsStationPopup = null;
    }
  }

  private emsStationClick(e) {
    const layer = e.target;
    const emsStation = layer.feature;
    if (emsStation) {
      const latlng = [emsStation.geometry.coordinates[1], emsStation.geometry.coordinates[0]];

      this.emsStationPopup = new Popup({
        offset: [10, -10],
        closeButton: false
      })
        .setLatLng(latlng)
        .setContent('<b>' + String(emsStation.properties.MONITORING_LOCATION_ID) + '</b>' + '<br>Local Watershed Area: ' + (emsStation.properties.WATERSHED_AREA / 100).toFixed(1) + ' sq km')
        .addTo(this.map)
        ;
    }
  }
  private tempLayersInit() {
    /*-----MT. POLLEY MINE MARKER-----*/
    const mtPolleyMarker = new CircleMarker([52.513437, -121.596309], {
      title: 'Mt. Polley Mine',
      weight: 7
    }).addTo(this.map);
    mtPolleyMarker.bindPopup('Mt. Polley Mine').openPopup();
  }

  private loadJson(layer: GeoJSON, file: string) {
    this.http.get(file).toPromise().then(response => {
      console.log(file);
      layer.clearLayers();
      const json = response.json();
      layer.addData(json);
    });
  }
}

