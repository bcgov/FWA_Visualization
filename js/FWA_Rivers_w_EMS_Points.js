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

var rivers;
var highlightedRiver;
var EMS_Stations;
var highlightedEMS_Stn;

function EMS_StationStyle(EMS_Station) {
	var color = '#000000';
  var weight = 1;
	if (highlightedEMS_Stn) {
		var EMS_Station_Id = EMS_Station.properties.MONITORING_LOCATION_ID;
		var highlightedEMS_StnId = highlightedEMS_Stn.properties.MONITORING_LOCATION_ID;
		if (highlightedEMS_StnId == EMS_Station_Id) {
			color = '#00FFFF';
      weight = 10;
		} else {
		  var highlightedEMS_StnDescendentIds = highlightedEMS_Stn.properties.d;
      if (highlightedEMS_StnDescendentIds && highlightedEMS_StnDescendentIds.includes(EMS_Station_Id)) {
			  color = '#FF0000';
        weight = 5;
		  } else {
				var highlightedEMS_StnAncestorsIds = highlightedEMS_Stn.properties.a;
				if (highlightedEMS_StnAncestorsIds && highlightedEMS_StnAncestorsIds.includes(EMS_Station_Id)) {
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
  
  function getFWAStreamJson(simp){  //Removed unneeded arguments here
    //var url = 'file' + simp + '.geojson';
    map.removeLayer(rivers);
    layerControl.removeLayer(rivers); //Added layerControl here
    //rivers.clearLayers();  I don't believe this needed.
    $.getJSON(simp, function(data){
      rivers = L.geoJson(data, {
        style: riverStyle,
        onEachFeature: function(feature, layer) {
          layer.on({
            mouseover: riverMouseOver,
            mouseout: riverMouseOut
          });
          layer.on({
            //click: addStreamLabelOnStream
            //click: addStreamMarkerOnStream
            //click: addStreamLabelInMap
            click: addStreamPopupOnStream
            //mouseout: removeStreamLabels
        });
          //layer.bindPopup(feature.properties.id);
        }
      });
      rivers.addTo(map);
      
    layerControl.addOverlay(rivers,'FWA Stream Network'); //Added layerControl here
    });
  }

  function getEMSJson(simp){  //Removed unneeded arguments here
  //var url = 'file' + simp + '.geojson';
  map.removeLayer(EMS_Stations);
  layerControl.removeLayer(EMS_Stations); //Added layerControl here
  //EMS_Stations.clearLayers();  I don't believe this needed.
  $.getJSON(simp, function(data){
    EMS_Stations = L.geoJson(data, {
      //style: EMS_StationStyle,
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: '#ff7800',
          color: '#000',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8 
          });
      },
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: EMS_StationMouseOver,
          mouseout: EMS_StationMouseOut
        });
        layer.on({
          click: addEMS_StationPopupOnStation
          //mouseout: removeStreamLabels
      });
        //layer.bindPopup(feature.properties.MONITORING_LOCATION_ID);
      }
    });
    EMS_Stations.addTo(map);
    
  layerControl.addOverlay(EMS_Stations,'Environmental Monitoring System Station'); //Added layerControl here
  });
}
  
  var markers = new L.FeatureGroup();

  function addEMS_StationPopupOnStation(e) {
      var layer = e.target;
      var EMS_Station = layer.feature;
      if (EMS_Station) {
          //var latlng = [50.5, -128.0];
          //var latlng = layer.getBounds().getCenter();
          var latlng = [EMS_Station.geometry.coordinates[1], EMS_Station.geometry.coordinates[0]];

          /*-----L.popup-----*/
          var popup = L.popup({
              offset: [10, -10],
              closeButton: false //set to true if 'mouseout' lines (below) are commented out
          });

          popup.setLatLng(latlng);
          popup.setContent('<b>' + String(EMS_Station.properties.MONITORING_LOCATION_ID) + '</b>' + '<br>Local Watershed Area: ' + (EMS_Station.properties.WATERSHED_AREA / 100).toFixed(1) + ' sq km');
          popup.addTo(map);

          //remove popup from map on 'mouseout'
          layer.on('mouseout', function (e) {
              map.removeLayer(popup);
          });
      }
  }
     
  function addStreamPopupOnStream(e) {
    var layer = e.target;
      var river = layer.feature;
      if (river) {
        //var latlng = [50.5, -128.0];
        var latlng = layer.getBounds().getCenter();
        
        /*-----L.popup-----*/
        var popup = L.popup({
          offset: [10, -10],
          closeButton: false //set to true if 'mouseout' lines (below) are commented out
        });
        
        popup.setLatLng(latlng);
        popup.setContent('<b>' + String(river.properties.name) + '</b>' + '<br>Segment length: ' + (river.properties.seglen/1000).toFixed(1) + ' km' + '<br>Upstream length: ' + (river.properties.upslen/1000).toFixed(1) + ' km' + '<br>Downstream length: ' + (river.properties.dwnslen/1000).toFixed(1) + ' km');
        popup.addTo(map);
        
        //remove popup from map on 'mouseout'
        layer.on('mouseout', function(e) {
          map.removeLayer(popup);
        });
      }
    }
       
  var geomarkId = $.urlParam('geomarkId');
	
 
  
/*-----OVERLAYS-----*/

  var crs84 = new L.Proj.CRS('CRS:84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
  
  /*-----GEOJSON-----*/ 


  $.getJSON('EMS_Monitoring_Locations_QUES.geojson', function (data) {
      EMS_Stations = L.geoJson(data, {
          /*style: EMS_StationStyle, */
          onEachFeature: function (feature, layer) {
              layer.on({
                  mouseover: EMS_StationMouseOver,
                  mouseout: EMS_StationMouseOut
              });
              //layer.bindPopup(feature.properties.id); //TODO: figure this out
          }
      });
      //map.fitBounds(EMS_Stations.getBounds());
      //EMS_Stations.addTo(map);

      //layerControl.addOverlay(EMS_Stations,'Environmental Monitoring System Station');
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
  MtPolleyMarker.bindPopup('Mt. Polley Mine').openPopup();

  /*-----ZOOM-AWARE GEOJSONs-----*/
  var simpCounter = 0;
  
  map.on('zoomend', function(e) {
    if (map.getZoom() >= 10) {
      if (simpCounter == 0 || simpCounter == 2) {
      getFWAStreamJson('QUES_2O_NET10M.geojson');
      getEMSJson('EMS_Monitoring_Locations_QUES.geojson');
      simpCounter = 1;
      }
    } else if (map.getZoom() <= 9) {
        if (simpCounter == 0 || simpCounter == 1) {
        getFWAStreamJson('FWA_BC_200M.geojson');
        simpCounter = 2;
      }
    }
  });
  
});

