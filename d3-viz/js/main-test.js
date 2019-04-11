//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

  //pseudo-global variables
  var attrArray = ["totalPop2013", "EuropeanOtherNZ", "Maori", "PacificPeoples", "Asian", "MiddleEasternLatinAmericanAfrican"]; //list of attributes
  var expressed = attrArray[0]; //initial attribute

  //begin script when window loads
  window.onload = setMap();

  //set up choropleth map
  function setMap(){
    //map frame dimensions
    var width = window.innerWidth * 0.4,
        height = 460;


        //create new svg container for the map
        map = d3.select("body")
          .append("svg")
          .attr("class", "map")
          .attr("width", width)
          .attr("height", height);

        //Add box for background
        innerRect = map.append("rect")
          .attr("width", width)
          .attr("height", height)
          .style("fill", "#D5E3FF"); //fill color

      //create Albers equal area conic projection centered on Newe Zealand
      var projection = d3.geoAlbers()
      .center([-4.74, 29.06])
      .rotate([-180, 70.36, 0])
      .parallels([32.73, 81.46])
      .scale(1758.89)
      .translate([width / 2, height / 2]);

      // Sets variable for projection
      var path = d3.geoPath()
          .projection(projection);

      //use Promise.all to parallelize asynchronous data loading
      var promises = [];
      promises.push(d3.csv("data/NZPop2013.csv")); //load attributes from csv
      promises.push(d3.json("data/NZRegions.topojson")); //load background spatial data
      Promise.all(promises).then(callback);
      // Sets call back function for data
      function callback(data){
      	csvData = data[0]; // Population data
      	newzealand = data[1]; // NZ districts


        //place graticule on the map
        setGraticule(map, path);

        //translate new zealand TopoJSON
        var newZealandDistricts = topojson.feature(newzealand, newzealand.objects.Pop_NZ2013).features;

        //join csv data to GeoJSON enumeration units
        newZealandDistricts = joinData(newZealandDistricts, csvData);

        //create the color scale
        var colorScale = makeColorScale(csvData);

        //add enumeration units to the map
        setEnumerationUnits(newZealandDistricts, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(csvData, colorScale);

      };
    }; //end of setMap()

  function setGraticule(map, path){
    //create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    //create graticule background
    var gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule

    //create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
  };

  function joinData(newZealandDistricts, csvData){

    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<csvData.length; i++){
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.REGC2015_V; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<newZealandDistricts.length; a++){

            var geojsonProps = newZealandDistricts[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.REGC2015_V; //the geojson primary key

            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){

                //assign all attributes and values
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]); //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };
      return newZealandDistricts;
  };

  //function to create color scale generator
  function makeColorScale(data){

      // Sets color classes
      var colorClasses = [
          "#D4B9DA",
          "#C994C7",
          "#DF65B0",
          "#DD1C77",
          "#980043"
      ];

      //create color scale generator
      var colorScale = d3.scaleThreshold()
          .range(colorClasses);

      //build array of all values of the expressed attribute
      var domainArray = [];
      for (var i=0; i<data.length; i++){
          var val = parseFloat(data[i][expressed]);
          domainArray.push(val);
      };

      //cluster data using ckmeans clustering algorithm to create natural breaks
      var clusters = ss.ckmeans(domainArray, 5);
      //reset domain array to cluster minimums
      domainArray = clusters.map(function(d){
          return d3.min(d);
      });

      //remove first value from domain array to create class breakpoints
      domainArray.shift();

      //assign array of last 4 cluster minimums as domain
      colorScale.domain(domainArray);
      return colorScale;
  };
  // Creates function to set enumeration units
  function setEnumerationUnits(newZealandDistricts, map, path, colorScale){

    //add NZ regions to map
    var districts = map.selectAll(".districts")
        .data(newZealandDistricts)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "districts " + d.properties.REGC2015_V;
        })
        .attr("d", path)
        .style("fill", function(d){
          return choropleth(d.properties, colorScale);
        });
};

  //function to test for data value and return color
  function choropleth(props, colorScale){

      //make sure attribute value is a number
      var val = parseFloat(props[expressed]);
      //if attribute value exists, assign a color; otherwise assign gray
      if (typeof val == 'number' && !isNaN(val)){
          return colorScale(val);
      } else {
          return "#CCC";
      };
  };

  //function to create coordinated bar chart
  function setChart(csvData, colorScale){
      //chart frame dimensions
      var chartWidth = window.innerWidth * 0.425,
          chartHeight = 460,
          leftPadding = 45,
          rightPadding = 2,
          topBottomPadding = 0,
          chartInnerWidth = chartWidth - leftPadding - rightPadding,
          chartInnerHeight = chartHeight - topBottomPadding * 2,
          translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

      //create a second svg element to hold the bar chart
      var chart = d3.select("body")
          .append("svg")
          .attr("width", chartWidth)
          .attr("height", chartHeight)
          .attr("class", "chart");

      //create a rectangle for chart background fill
      var chartBackground = chart.append("rect")
          .attr("class", "chartBackground")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);

      //create a scale to size bars proportionally to frame and for axis
      var yScale = d3.scaleLinear()
          .range([463, 0])
          .domain([0, 1600000]);

      //set bars for each province
      var bars = chart.selectAll(".bar")
          .data(csvData)
          .enter()
          .append("rect")
          .sort(function(a, b){
              return b[expressed]-a[expressed]
          })
          .attr("class", function(d){
              return "bar " + d.REGC2015_V;
          })
          .attr("width", chartInnerWidth / csvData.length - 1)
          .attr("x", function(d, i){
              return i * (chartInnerWidth / csvData.length) + leftPadding;
          })
          .attr("height", function(d, i){
              return 463 - yScale(parseFloat(d[expressed]));
          })
          .attr("y", function(d, i){
              return yScale(parseFloat(d[expressed])) + topBottomPadding;
          })
          .style("fill", function(d){
              return choropleth(d, colorScale);
          });

      //create a text element for the chart title
      var chartTitle = chart.append("text")
          .attr("x", 90)
          .attr("y", 40)
          .attr("class", "chartTitle")
          .text("Total Population in Each Region in 2013");

      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale);

      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);

      //create frame for chart border
      var chartFrame = chart.append("rect")
          .attr("class", "chartFrame")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);
  };
})(); //last line of main.js
