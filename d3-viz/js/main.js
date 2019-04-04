//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){


    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

        //Add box for background
        var innerRect = map.append("rect")
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

          //translate new zealand TopoJSON
          var newZealandDistricts = topojson.feature(newzealand, newzealand.objects.Pop_NZ2013).features;

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

          //add NZ regions to map
          var districts = map.selectAll(".regions")
              .data(newZealandDistricts)
              .enter()
              .append("path")
              .attr("class", function(d){
                  return "regions " + d.properties.REGC2015_V;
              })
              .attr("d", path);
    };
  };
