
/*** Global object that contains the app ***/
var app = app || {};


//BEGIN CODE
// keep map stuff in a part of the app object as to not pollute the global name space
app.map = (function(w,d, $, _){

  
//SET GLOBAL VARIABLES*******************************************************************************
  //  define all  variables for map parts and layers 
  //  store in an object called 'el' that can be accessed elsewhere
  var el = {
    //general map variables
    baseLayers : null,
    cdbURL : null,
    geocoder : null,
    geocoderMarker : null, 
    legend : null,
    map : null,
    mapboxTiles : null,
    satellite : null,
    sql : null,   
    styles: null,
    //for creating layers from geojson
    contractsPoly : null, 
    smokefreePoly : null,
    synarPoly : null,
    taxPoly: null,
    youthPoly: null,
    adultPoly: null,
    //for sql queries 
    fdaWarnings : null,
    fdaContracts : null, 
    synarRates: null,
    smokefreeLaws : null, 
    taxRates: null,
    youthRates: null,
    adultRates: null,
    //to create layers and legends 
    fdaWarningsActions : null,
    //for creating feature group objects
    featureGroupSynar : null,
    featureGroupContracts : null,
    featureGroupSmokefree : null,
    featureGroupTax: null,
    featureGroupYouth: null,
    featureGroupAdult: null,
    template : null
  };

  // reference cartocss styles from mapStyles.js
  el.styles = app.mapStyles;
  // url to cartodb FDA Violations map viz json
  el.cdbURL = "https://legacy.cartodb.com/api/v2/viz/3fe5ca92-0315-11e6-801b-0e31c9be1b51/viz.json";

  // queries for warning violatiions - sent to cartodb when layer buttons clicked
  el.sql = {
    warningLetters : "SELECT * FROM allwarnings_dc_nc_va WHERE decisiontype = 'Warning Letter'",
    civilPenalties : "SELECT * FROM allwarnings_dc_nc_va WHERE decisiontype = 'Civil Money Penalty'",
    synarRates: "SELECT * FROM synar_states",
    fdaContracts: "SELECT * FROM fda_state_contracts",
    smokefreeLaws: "SELECT * FROM smokefree_indoor_laws",
    taxRates: "SELECT * FROM cigarette_excise_tax",
    youthRates: "SELECT * FROM youth_smoking",
    adultRates: "SELECT * FROM adult_smoking",
  };

  // compile the underscore legend template for rendering map legends for choropleth layers
  _.templateSettings.variable = "legend";
  el.template = _.template($("script.template").html());

  el.legend = $('#ui-legend');

  // use google maps api geocoder
  el.geocoder = new google.maps.Geocoder();

//END SET GLOBAL VARIABLES*******************************************************************************

//BEGIN INIT ********************************************************************************************                                                                       
  
  // set up the map and map layers
  var initMap = function() {
    // map paramaters to pass to Leaflet
    var params = {
      center : [35.816408,-78.638223], //Raleigh
      //minZoom : 14,
      //maxZoom : 19,
      zoom : 6,
      //maxBounds : L.latLngBounds([40.675496,-73.957987],[40.714216,-73.877306]), 
      zoomControl : false,
      infoControl: false,
      attributionControl: true
    }

    // coerce Leaflet into allowing multiple popups to be open simultaneously
    L.Map = L.Map.extend({
        openPopup: function(popup) {
            //this.closePopup();
            this._popup = popup;

            return this.addLayer(popup).fire('popupopen', {
                popup: this._popup
            });
        }
    });
  
    // instantiate the Leaflet map object
    el.map = new L.map('map', params);
    
    // api key for mapbox tiles 
    L.mapbox.accessToken = 'pk.eyJ1Ijoibnl1bWhlYWx0aCIsImEiOiJjaW5xMXU5d2IxMDlldWdseW9zbXl3dG94In0.pC5lMAc_tKvgtUcHquXuwg';

    // tileLayer for mapbox basemap
    el.mapboxTiles = L.mapbox.tileLayer('chenrick.map-3gzk4pem');
    el.map.addLayer(el.mapboxTiles); 

    // add mapbox and osm attribution
    var attr = "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    el.map.attributionControl.addAttribution(attr);

    // feature groups to store geoJSON
    el.featureGroupSynar = L.featureGroup().addTo(el.map); 
    el.featureGroupContracts = L.featureGroup().addTo(el.map);  
    el.featureGroupSmokefree = L.featureGroup().addTo(el.map); 
    el.featureGroupTax = L.featureGroup().addTo(el.map); 
    el.featureGroupYouth = L.featureGroup().addTo(el.map); 
    el.featureGroupAdult = L.featureGroup().addTo(el.map); 

    // add Bing satelitte imagery layer
    el.satellite = new L.BingLayer('AkuX5_O7AVBpUN7ujcWGCf4uovayfogcNVYhWKjbz2Foggzu8cYBxk6e7wfQyBQW');

    // object to pass Leaflet Control
     el.baseLayers = {
        streets: el.mapboxTiles,
        satellite: el.satellite
    };

    // inits UI element for toggling base tile layers
    L.control.layers(el.baseLayers, {}, {
          position: 'bottomleft'
      }).addTo(el.map);

    // makes sure base layers stay below the cartodb data
    el.map.on('baselayerchange', function(e){
      e.layer.bringToBack();
    })  

    //CALL THE FUNCTIONS TO CREATE MAP LAYERS
    // add geojson layers
    loadSynar();
    loadContracts();
    loadSmokefree();
    loadTax();
    loadYouth();
    loadAdult();

    // add the warnings layer from cartodb
    getCDBData();

  }   

//END INIT ******************************************************************************************** 


//BEGIN CREATE GEOJSON LAYERS *************************************************************************

// SYNAR GEOJSON load the geoJSON boundary Synar State Rates ******************************************
  
  function loadSynar() {
    GeojsonFile = "synar_states.geojson"
    $.getJSON('./data/synar_states.geojson', function(json, textStatus) {
        el.synarPoly = L.geoJson(json, {
          style: style,
          onEachFeature: onEachFeature
        });
    });
  } 

  //set style and color for geojson choropleth
  function style(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColor(feature.properties.percent)
      };
    }

    // get color depending on percent field
    function getColor(d) {
      return d > 11 ? '#2C7FB8' :
             d > 7.55  ? '#7FCDBB' :
                        '#EDF8B1';
    }
   
    //set mouse over and click events on polygons 
    function onEachFeature(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>" + feature.properties.name + "<br><center> Violation Rate: " + feature.properties.label);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightSynar,
        click: zoomToFeature
      });
    } 

    function resetHighlightSynar(e) {
       el.synarPoly.resetStyle(e.target);    
    }  
// END FOR JUST SYNAR*************************************************


// Load the geoJSON boundary FDA Contracts*******************************
  function loadContracts() {
    $.getJSON('./data/fda_state_contracts.geojson', function(json, textStatus) {  
        el.contractsPoly = L.geoJson(json, {
          style: styleContracts,
          onEachFeature: onEachFeatureContracts
        });
    });
  } 
  //set style and color for geojson choropleth
  function styleContracts(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColorContracts(feature.properties.total_num)
      };
    }

    // get color depending on percent field
    function getColorContracts(d) {
      return d > 9350000  ? '#2CA25F' :
             d > 4800000 ? '#99D8C9' :
                          '#E5F5F9' ;
    }
   
    //set mouse over and click events on polygons 
    function onEachFeatureContracts(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>" + feature.properties.name + "<br><center> Total Awards: " + feature.properties.total_label);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightContracts,
        click: zoomToFeature
      });
    } 

    function resetHighlightContracts(e) {
       el.contractsPoly.resetStyle(e.target);      
      // info.update();
    } 
     
// END FOR JUST CONTRACTS*************************************************

// Smokefree load the geoJSON **************************************** 
  function loadSmokefree() {
    $.getJSON('./data/smokefree_indoor_laws.geojson', function(json, textStatus) {  
        el.smokefreePoly = L.geoJson(json, {
          style: styleSmokefree,
          onEachFeature: onEachFeatureSmokefree
        });
    });
  } 

  //set style and color for geojson choropleth
  function styleSmokefree(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColorSmokefree(feature.properties.smokefree)
      };
    }

    // get color depending on percent field
    function getColorSmokefree(d) {
      return d == 0  ? '#919da3' :
             d == 1 ? '#fec44f' :
             d == 2 ? '#d95f0e' :
                    '#000000' ;
    }
   
    //set mouse over and click events on polygons 
    function onEachFeatureSmokefree(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>Smokefree State Laws:<br>" + feature.properties.label);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightSmokefree,
        click: zoomToFeature
      });
    } 

    function resetHighlightSmokefree(e) {
       el.smokefreePoly.resetStyle(e.target);      
    } 
     
// END FOR SMOKESFREE*************************************************

// EXCISE TAX load the geoJSON*********************************** 
  function loadTax() {
    $.getJSON('./data/cigarette_excise_tax.geojson ', function(json, textStatus) {  
        el.taxPoly = L.geoJson(json, {
          style: styleTax,
          onEachFeature: onEachFeatureTax
        });
    });
  } 
  //set style and color for geojson choropleth
  function styleTax(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColorTax(feature.properties.tax)
      };
    }

    // get color depending on percent field
    function getColorTax(d) {
      return d > 3.99  ? '#91003F' :
             d > 2.99 ? '#CE1256' :
             d > 1.99 ? '#E7298A' :
             d > .99 ? '#DF65B0' :
             d > .49 ? '#D4B9DA' :
                    '#F1EEF6' ;
    }
   
    //set mouse over and click events on polygons 
    function onEachFeatureTax(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>Cigarette Excise Tax:<br>" + feature.properties.tax_label);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightTax,
        click: zoomToFeature
      });
    } 

    function resetHighlightTax(e) {
       el.taxPoly.resetStyle(e.target);      
    } 
     
// END FOR EXCISE TAX*************************************************

// YOUTH SMOKING load the geoJSON*********************************** 
  function loadYouth() {
    $.getJSON('./data/youth_smoking.geojson', function(json, textStatus) {  
        el.youthPoly = L.geoJson(json, {
          style: styleYouth,
          onEachFeature: onEachFeatureYouth
        });
    });
  } 
  //set style and color for geojson choropleth
  function styleYouth(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColorYouth(feature.properties.rate)
      };
    }

    // get color depending on percent field
    function getColorYouth(d) {
      return d = null  ? '#cecec4' :
             d > 15 ? '#e31a1c' :
             d > 10 ? '#fd8d3c' :
             d > 5 ? '#FECC5C' :
                    '#FFFFB2' ;
    }
   
    //set mouse over and click events on polygons 
    function onEachFeatureYouth(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>Youth Smoking Rate 2013:<br>" + feature.properties.rate);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightYouth,
        click: zoomToFeature
      });
    } 

    function resetHighlightYouth(e) {
       el.youthPoly.resetStyle(e.target);      
    } 
     
// END FOR YOUTH SMOKING ************************************************

// ADULT SMOKING GEOJSON load the geoJSON*********************************** 
  function loadAdult() {
    $.getJSON('./data/adult_smoking.geojson', function(json, textStatus) {  
        el.adultPoly = L.geoJson(json, {
          style: styleAdult,
          onEachFeature: onEachFeatureAdult
        });
    });
  } 
  //set style and color for geojson choropleth
  function styleAdult(feature) {
      return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7,
        fillColor: getColorAdult(feature.properties.data_value)
      };
    }

    // get color depending on percent field
    function getColorAdult(d) {
      return d > 25  ? '#BD0026' :
             d > 20 ? '#F03B20' :
             d > 15 ? '#FD8D3C' :
             d > 10 ? '#FECC5C' :
                    '#FFFFB2' ;
    }
   
    //set mouse over and click events on polygons 
    function onEachFeatureAdult(feature, layer) {
      //have popup show 
      layer.bindPopup("<center>Adult Smoking Rate 2014:<br>" + feature.properties.data_value);
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlightAdult,
        click: zoomToFeature
      });
    } 

    function resetHighlightAdult(e) {
       el.adultPoly.resetStyle(e.target);      
    } 
     
// END FOR ADULT SMOKING ************************************************

//USED IN ALL LAYERS
    function highlightFeature(e) {
      var layer = e.target;
      layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
      });
      if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
      }
    }

    function zoomToFeature(e) {
      el.map.fitBounds(e.target.getBounds());
    }

//END CREATE GEOJSON LAYERS *************************************************************************

//BEGIN CREATELAYER LAYERS **************************************************************************

  // function to load map all warnings layer from CartoDB
  var getCDBData = function() {  
    
    //create warnings layers (warning letters and civil penalties) with viz.json api call and createlayer function
    cartodb.createLayer(el.map, el.cdbURL, {
        cartodb_logo: false, 
        legends: false,
        https: true 
      }, 
      function(layer) {
        //get count
        var num_sublayers = layer.getSubLayerCount();
        //alert(num_sublayers);
        // store the warnings sublayer - all warnings and civil penalties
        layer.getSubLayer(0).setCartoCSS(el.styles.warningLetters);
        layer.getSubLayer(0).setSQL(el.sql.warningLetters);
        el.fdaWarnings = layer.getSubLayer(0); 
        //store graduated circle version of warnings'

        // positions the tool tip in relationship to user's mouse
        // offset it by 5px vertically and horizontally so the mouse arrow won't cover it
        var event = function(e){
              $('#tool-tip').css({
                 left:  e.pageX + 5,
                 top:   e.pageY + 5
              });
          };                                

        // add the cdb layer to the map
        el.map.addLayer(layer, false);

        // make sure the base layer stays below the cdb layer      
        el.mapboxTiles.bringToBack();

      }).on('done', function() {
        
      }); // end cartodb.createLayer!      
  };

  // change the cartoCSS of a layer
  var changeCartoCSS = function(layer, css) {
    layer.setCartoCSS(css);
  };

  // change SQL query of a layer
  var changeSQL = function(layer, sql) {
    layer.setSQL(sql);
  }

  // corresponding cartoCSS & SQL changes to FDA WARNINGS layer buttons
  // legends are displayed or hidden as needed
  el.fdaWarningsActions = {                          
     warningLetters : function() {
      changeCartoCSS(el.fdaWarnings, el.styles.warningLetters);
      changeSQL(el.fdaWarnings, el.sql.warningLetters);
      // renderLegend(el.legendData.warningLetters);
      return true;
    },
     civilPenalties : function() {
      changeCartoCSS(el.fdaWarnings, el.styles.civilPenalties);
      changeSQL(el.fdaWarnings, el.sql.civilPenalties);
      // renderLegend(el.legendData.civilPenalties);
      return true;
    },
      synar_checkbox : function() {
      renderLegend(el.legendData.synarRates);
      return true;
    },
      contracts_checkbox : function() {
      renderLegend(el.legendData.fdaContracts);
      return true;
    },
      smokefree_checkbox : function() {
      renderLegend(el.legendData.smokefreeLaws);
      return true;
    },
      tax_checkbox : function() {
      renderLegend(el.legendData.taxRates);
      return true;
    },
      youth_checkbox : function() {
      renderLegend(el.legendData.youthRates);
      return true;
    },
      adult_checkbox : function() {
      renderLegend(el.legendData.adultRates);
      return true;
    },
    
  };

  // add FDA WARNINGS layer button event listeners
  var initButtons = function() {
    $('.button').click(function(e) {
      // e.preventDefault(); 
      $('.button').removeClass('selected');
      $(this).addClass('selected');
      el.fdaWarningsActions[$(this).attr('id')]();
      el.fdaWarnings.show();
    }); 
  }

  // FOR Choropleth LAYERS toggle additional layers based on check box boolean value
  var initCheckboxes = function() {
    // checkboxes for dob permit layer & stories
    var checkboxDOB = $('input.dob:checkbox'),
          $fc = $('#contracts_checkbox'),
          $sg = $('#synar_checkbox'),
          $sf = $('#smokefree_checkbox');
          $tx = $('#tax_checkbox');
          $ys = $('#youth_checkbox');
          $as = $('#adult_checkbox');

    //toggle FDA Contracts layer
    $fc.change(function(){
      if ($fc.is(':checked')){
        // el.fdaContracts.show();
        el.featureGroupContracts.addLayer(el.contractsPoly);
        el.fdaWarningsActions['contracts_checkbox']();           
      } else {
        // el.fdaContracts.hide();
        el.featureGroupContracts.removeLayer(el.contractsPoly);
        el.legend.addClass('hidden');
      };
    });

    //toggle SYNAR layer
    $sg.change(function(){
      if ($sg.is(':checked')) {
        el.featureGroupSynar.addLayer(el.synarPoly);
        el.fdaWarningsActions['synar_checkbox']();        
      } else {    
        el.featureGroupSynar.removeLayer(el.synarPoly);
        el.legend.addClass('hidden');
      };
    }); 

    //toggle smokefree layer
    $sf.change(function(){
      if ($sf.is(':checked')) {
        el.featureGroupSmokefree.addLayer(el.smokefreePoly);
        el.fdaWarningsActions['smokefree_checkbox']();        
      } else {    
        el.featureGroupSmokefree.removeLayer(el.smokefreePoly);
        el.legend.addClass('hidden');
      };
    }); 

    //toggle excise tax layer
    $tx.change(function(){
      if ($tx.is(':checked')) {
        el.featureGroupTax.addLayer(el.taxPoly);
        el.fdaWarningsActions['tax_checkbox']();        
      } else {    
        el.featureGroupTax.removeLayer(el.taxPoly);
        el.legend.addClass('hidden');
      };
    }); 

    //toggle youth smoking layer
    $ys.change(function(){
      if ($ys.is(':checked')) {
        el.featureGroupYouth.addLayer(el.youthPoly);
        el.fdaWarningsActions['youth_checkbox']();        
      } else {    
        el.featureGroupYouth.removeLayer(el.youthPoly);
        el.legend.addClass('hidden');
      };
    }); 

    //toggle adult smoking layer
    $as.change(function(){
      if ($as.is(':checked')) {
        el.featureGroupAdult.addLayer(el.adultPoly);
        el.fdaWarningsActions['adult_checkbox']();        
      } else {    
        el.featureGroupAdult.removeLayer(el.adultPoly);
        el.legend.addClass('hidden');
      };
    }); 

  }
  
  // geocode search box text and create a marker on the map
  var geocode = function(address) {
    // reference bounding box for DC to improve geocoder results: 40.678685,-73.942451,40.710247,-73.890266
    var bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(38.788026,-77.218511), // sw - CHANGE THIS TO US AFTER TESTINGS
          new google.maps.LatLng(39.014598,76.794164) // ne
          );    
      el.geocoder.geocode({ 'address': address, 'bounds' : bounds }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          var latlng = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
          console.log('gecoder results: ', results, ' latlng: ', latlng);
          
          // remove geocoded marker if one already exists
          if (el.geocoderMarker) { 
            el.map.removeLayer(el.geocoderMarker);
          }
          // add a marker and pan and zoom the map to it
          el.geocoderMarker = new L.marker(latlng).addTo(el.map);
          el.geocoderMarker.bindPopup("<h4>" + results[0].formatted_address + "</h4>" ).openPopup();
          el.map.setView(latlng, 18);          
          } else {
            console.log('geocode unsuccesful: ', status);
          }
      });
  }

  // search box ui interaction TO DO: check to see if point is outside of Bushwick bounds
  var searchAddress = function() {
    $('#search-box').focus(function(){
      if ($(this).val()==="Search for a Bushwick address") {
        $(this).val("");
      }
    });
    $('#search-box').on('blur',function(){      
      if ($(this).val()!=="") {
        $address = $(this).val()
        geocode($address);  
        $(this).val("");
      } 
    });
  }

//  function to render choropleth legends
  var renderLegend = function(data) {
    if (data === null) { 
      el.legend.addClass('hidden');
      return;
    }
    var legendData = {
      title : data.title,
      items : data.items,// array of objects containing color and values
    };    
    el.legend.html(el.template(legendData));
    if (el.legend.hasClass('hidden')) el.legend.removeClass('hidden');
  };

  // set up custom zoom buttons
  var initZoomButtons = function(){
    $('#zoom-in').on('click', function(){
      el.map.zoomIn();
    });
    $('#zoom-out').on('click', function(){
      el.map.zoomOut();
    });
  }

//CSS - ADJUST FOR CHOROPLETH
  // data passed to renderLegend();
  // to do: generate this dynamically from cartocss
  el.legendData = {
     synarRates : {
      title : "Synar Retailer Violation Rates",
      items : [
        {
          color : "#2C7FB8",
          label : "<= 22.5"
        },
        {
          color: "#7FCDBB",
          label : "<= 11"
        },
        {
          color : "#EDF8B1",
          label : "<= 7.55"
        }
      ]
    },
    fdaContracts : {
      title : "FDA Inspection Contract Totals",
      items : [
        {
          color : "#2CA25F",
          label : "< $14,000,000"
        },
        {
          color: "#99D8C9",
          label : "< $9,350,000"
        },
        {
          color : "#E5F5F9",
          label : "< $4,800,000"
        }
      ]
    },
      smokefreeLaws : {
      title : "Smokefree Law Type",
      items : [
        {
          color : "#d95f0e",
          label : "all categories"
        },
        {
          color: "#fec44f",
          label : "one or two categories"
        },
        {
          color : "#000000",
          label : "not yet enacted"
        },
        {
          color : "#919da3",
          label : "none"
        }
      ]
    },
    taxRates : {
      title : "Excise Tax 2016 - Dollars",
      items : [
        {
          color : "#91003F",
          label : "> 4.00"
        },
        {
          color: "#CE1256",
          label : "3.00 - 3.99"
        },
        {
          color : "#E7298A",
          label : "2.00 - 2.99"
        },
        {
          color : "#DF65B0",
          label : "1.00 - 1.99"
        },
        {
          color : "#D4B9DA",
          label : ".50 - .99"
        },
        {
          color : "#F1EEF6",
          label : "0 - .49"
        }
      ]
    },
      youthRates : {
      title : "Youth Smoking Rates - 2013",
      items : [
        {
          color : "#e31a1c",
          label : "20 - 15.01"
        },
        {
          color: "#fd8d3c",
          label : "15 - 10.01"
        },
        {
          color : "#FECC5C",
          label : "10 - 5.01"
        },
        {
          color : "#FFFFB2",
          label : "5 - 0"
        },
        {
          color : "#cecec4",
          label : "No Data"
        }
      ]
    },
      adultRates : {
      title : "Adult Smoking Rates - 2014",
      items : [
        {
          color : "#e31a1c",
          label : "30 - 25.01"
        },
        {
          color: "#fd8d3c",
          label : "25 - 15.01"
        },
        {
          color : "#FECC5C",
          label : "15 - 10.01"
        },
        {
          color : "#FFFFB2",
          label : "10 - 0"
        }
      ]
    },  
  };

  // get it all going!
  var init = function() {
    initMap();
    initButtons();
    initCheckboxes();
    searchAddress();
    initZoomButtons();  
  }

  // only return init() and the stuff in the el object
  return {
    init : init,
    el : el
  }

})(window, document, jQuery, _);

// call app.map.init() once the DOM is loaded
window.addEventListener('DOMContentLoaded', function(){
  app.map.init();  
});