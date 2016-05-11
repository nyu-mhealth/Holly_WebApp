/**** CartoCSS for styling tax lot data ****/
var app = app || {};

app.mapStyles = (function(){
  return {
    
    // just warning letters style - orange
    warningLetters : '#warningLetters {' +
                                  'marker-fill-opacity: 0.9;' +
                                  'marker-line-color: #FFF;' +
                                  'marker-line-width: 1;' +
                                  'marker-line-opacity: 1;' +
                                  'marker-placement: point;' +
                                  ' marker-type: ellipse;' +
                                  'marker-width: 10;' +
                                  'marker-fill: #FF9900;' +
                                  'marker-allow-overlap: true;' +
                                '}',

    // just civial penalties style - red
    civilPenalties : '#civilPenalties {' +
                                  'marker-fill-opacity: 0.9;' +
                                  'marker-line-color: #FFF;' +
                                  'marker-line-width: 1;' +
                                  'marker-line-opacity: 1;' +
                                  'marker-placement: point;' +
                                  ' marker-type: ellipse;' +
                                  'marker-width: 10;' +
                                  'marker-fill: #B40903;' +
                                  'marker-allow-overlap: true;' +
                                '}',
    
                                                                               
  };
})();
