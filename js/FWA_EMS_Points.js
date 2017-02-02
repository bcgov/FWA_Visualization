/* -----------------------------------------------------------------------------------
   Freshwater Atlas Stream Connectivity - Web Visualization
   Developed by GeoBC
   (c) 2016 GeoBC | http://www.geobc.gov.bc.ca  
----------------------------------------------------------------------------------- */

$.urlParam = function(name) {
  var results = new RegExp('[\\?&]' + name + '=([^&#]*)')
      .exec(window.location.href);
  if (!results) {
    return 0;
  }
  return results[1] || 0;
};

var EMS_Stations;
var highlightedEMS_Stn ;

function EMS_StationStyle(EMS_Station) {
	var color = "#000000";
  var weight = 1;
	if (highlightedEMS_Stn) {
		var EMS_Station_Id = EMS_Station.properties.id;
		var highlightedEMS_StnId = highlightedEMS_Stn.properties.id;
		if (highlightedEMS_StnId == EMS_Station_Id) {
			color = "#00FFFF";
      weight = 10;
		} else {
		  var highlightedEMS_StnDescendentIds = highlightedEMS_Stn.properties.d;
      if (highlightedEMS_StnDescendentIds && highlightedEMS_StnDescendentIds.includes(EMS_Station_Id)) {
			  color = "#FF0000";
        weight = 5;
		  } else {
				var highlightedEMS_StnAncestorsIds = highlightedEMS_Stn.properties.a;
				if (highlightedEMS_StnAncestorsIds && highlightedEMS_StnAncestorsIds.includes(EMS_Station_Id)) {
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

function EMS_StationMouseOver(e) {
	var layer = e.target;
  if (EMS_Stations) {
		var EMS_Station = layer.feature;
		if (EMS_Station) {
			highlightedEMS_Stn = EMS_Station;
		} else {
			highlightedEMS_Stn = undefined;
		}
		EMS_Stations.setStyle(EMS_StationStyle);
  }
}

function EMS_StationMouseOut(e) {
	highlightedEMS_Stn = undefined;
  if (EMS_Stations) {
    EMS_Stations.setStyle(EMS_StationStyle);
  }
}

$( document ).ready(function() {
  
  function getJson(simp){  //Removed unneeded arguments here
    //var url = 'file' + simp + '.geojson';
    map.removeLayer(EMS_Stations);
    layerControl.removeLayer(EMS_Stations); //Added layerControl here
    //EMS_Stations.clearLayers();  I don't believe this needed.
    $.getJSON(simp, function(data){
      EMS_Stations = L.geoJson(data, {
        style: EMS_StationStyle,
        onEachFeature: function(feature, layer) {
          layer.on({
            mouseover: EMS_StationMouseOver,
            mouseout: EMS_StationMouseOut
          });
          layer.on({
            //click: addStreamLabelOnStream
            //click: addStreamMarkerOnStream
            //click: addStreamLabelInMap
            click: addEMS_StationPopupOnStation
            //mouseout: removeStreamLabels
        });
          //layer.bindPopup(feature.properties.id);
        }
      });
      EMS_Stations.addTo(map);
      
    layerControl.addOverlay(EMS_Stations,'FWA Stream Network'); //Added layerControl here
    });
  }

  var markers = new L.FeatureGroup();
     
  function addEMS_StationPopupOnStation(e) {
    var layer = e.target;
      var EMS_Station = layer.feature;
      if (EMS_Station) {
        //var latlng = [50.5, -128.0];
        var latlng = layer.getBounds().getCenter();
        
        /*-----L.popup-----*/
        var popup = L.popup({
          offset: [10, -10],
          closeButton: false //set to true if 'mouseout' lines (below) are commented out
        });
        
        popup.setLatLng(latlng);
        popup.setContent("<b>" + String(EMS_Station.properties.name) + "</b>" + "<br>Segment length: " + (EMS_Station.properties.seglen/1000).toFixed(1) + " km" + "<br>Upstream length: " + (EMS_Station.properties.upslen/1000).toFixed(1) + " km" + "<br>Downstream length: " + (EMS_Station.properties.dwnslen/1000).toFixed(1) + " km");
        popup.addTo(map);
        
        //remove popup from map on 'mouseout'
        layer.on("mouseout", function(e) {
          map.removeLayer(popup);
        });
      }
    }
       
  var geomarkId = $.urlParam('geomarkId');
	var map = L.map('map', {
    minZoom: 1,
    maxZoom: 18
  });
  
/*-----BASE MAPS-----*/

  var provRoadsWM = new L.tileLayer.wms("http://maps.gov.bc.ca/arcserver/services/province/roads_wm/MapServer/WMSServer", {
    	layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia"
	}).addTo(map);
  
  var provWebMercatorCache = new L.tileLayer.wms("http://maps.gov.bc.ca/arcserver/services/Province/web_mercator_cache/MapServer/WMSServer", {
      layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia"
	});
  
/*-----OVERLAYS-----*/

  var crs84 = new L.Proj.CRS('CRS:84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
  
  /*-----POINTS OF DIVERSION-----*/  
  var pointsOfDiversion = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP/ows", {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia",
      crs:crs84,
      styles: 'Points_of_Diversion'
  }).addTo(map);

  /*-----POD LEGEND-----*/
  /*
  var pod_Legend_URL = "https://openmaps.gov.bc.ca/geo/pub/WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=pub%3AWHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP",
  imageBounds = [[50.712216, -123.10655], [50.812216, -123.20655]];
  
  L.imageOverlay(pod_Legend_URL, imageBounds).addTo(map);
  
  var pointsOfDiversion_Legend = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=pub%3AWHSE_WATER_MANAGEMENT.WLS_POD_LICENCE_SP", {
      layers: '0',
        format: 'image/png',
        styles: 'Points_of_Diversion'
  }).addTo(map); /*
  
  /*-----FWA WATERSHED GROUPS POLY-----*/  
  var fwaWatershedGroups = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows", {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia",
      crs:crs84,
      styles: 'FWA_Watershed_Groups_Outlined'
  }).addTo(map);
  
  /*-----FWA WATERSHED GROUPS LABELS-----*/  
  var fwaWatershedGroupsLabels = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY/ows", {
      layers: 'pub:WHSE_BASEMAPPING.FWA_WATERSHED_GROUPS_POLY',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia",
      crs:crs84,
      styles: 'FWA_Watershed_Groups_Labels'
  }).addTo(map);
  
  /*-----FWA WATERSHED GROUPS: LAYER GROUP-----*/
  var fwaWatershedGroups_LyrGrp = new L.layerGroup([fwaWatershedGroups, fwaWatershedGroupsLabels]
  ).addTo(map);
      
  /*-----FWA ASSESSMENT WATERSHEDS-----*/  
  var fwaAssessmentWatersheds = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY/ows", {
      layers: 'pub:WHSE_BASEMAPPING.FWA_ASSESSMENT_WATERSHEDS_POLY',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia",
      crs:crs84,
      styles: 'FWA_Assessment_Watersheds_Outlined'
  }) //.addTo(map);
  
  /*-----WATER RESOURCE MANAGMENT POINTS-----*/  
  var wtrResourceMgmtPoints = new L.tileLayer.wms("https://openmaps.gov.bc.ca/geo/pub/WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT/ows", {
      layers: 'pub:WHSE_WATER_MANAGEMENT.WLS_WATER_RESOURCE_MGMT_POINT',
        format: 'image/png',
        transparent: true,
        attribution: "© 2013-2016 GeoBC, DataBC, The Province of British Columbia",
      crs:crs84,
      styles: 'Protected_Rivers_Points'
  }).addTo(map);

  /*-----Layer Control-----*/
  var layerControl = L.control.layers(
    {
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
    }
  ).addTo(map);
 
  /*-----GEOJSON-----*/ 
  
  $.getJSON("EMS_Monitoring_Locations.geojson", function(data) {
    EMS_Stations = L.geoJson(data, {
      /*style: EMS_StationStyle, */
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: EMS_StationMouseOver,
          mouseout: EMS_StationMouseOut
        });
        //layer.bindPopup(feature.properties.id); //TODO: figure this out
      }
    });
    map.fitBounds(EMS_Stations.getBounds());
    EMS_Stations.addTo(map);
  
  layerControl.addOverlay(EMS_Stations,'Environmental Monitoring System Station');
  });
  
  /*-----SCALEBAR-----*/
  var scaleControl = L.control.scale(
    {
    imperial: false
    }
  ).addTo(map);
  
  /*-----MT. POLLEY MINE MARKER-----*/
  var MtPolleyMarker = L.marker([52.513437,-121.596309],
	{
	title: 'Mt. Polley Mine'
	}
  ).addTo(map);
  MtPolleyMarker.bindPopup("Mt. Polley Mine").openPopup();

  /*-----ZOOM-AWARE GEOJSONs-----*/
  /* var simpCounter = 0;
  
  map.on('zoomend', function(e) {
    if (map.getZoom() >= 10) {
      if (simpCounter == 0 || simpCounter == 2) {
      getJson("QUES_2O_NET10M.geojson");
      simpCounter = 1;
      }
    } else if (map.getZoom() <= 9) {
        if (simpCounter == 0 || simpCounter == 1) {
        getJson("FWA_BC_200M.geojson");
        simpCounter = 2;
      }
    }
  }); */
  
});

