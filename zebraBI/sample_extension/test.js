'use strict';

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {
    // Tell Tableau we'd like to initialize our extension
    tableau.extensions.initializeAsync().then(function () {
      
      // Fetch the saved sheet name from settings. This will be undefined
      // if there isn't one configured yet.
      const savedSheetName = tableau.extensions.settings.get('sheet');
      if (savedSheetName) {
        // We have a saved sheet name, show its selected marks
        loadSelectedMarks(savedSheetName);
      }
      else {
        // If there isn't a sheet saved in the settings, show the dialog.
        showChooseSheetDialog();
      }

      initializeButtons();

    });
  });

  /**
   * Shows the choose sheet UI. Once a sheet is selected, the data table for the sheet is shown
   */
  function showChooseSheetDialog () {
    // Clear out the existing list of sheets
    $('#choose_sheet_buttons').empty();

    // Set the dashboard's name in the title
    const dashboardName = tableau.extensions.dashboardContent.dashboard.name;
    $('#choose_sheet_title').text(dashboardName);

    // The first step in choosing a sheet will be asking Tableau what sheets are available
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

    // Next, we loop through all of these worksheets add add buttons for each one
    worksheets.forEach(function (worksheet) {
      // Declare our new button which contains the sheet name
      const button = createButton(worksheet.name);

      // Create an event handler for when this button is clicked
      button.click(function () {
        // Get the worksheet name which was selected
        const worksheetName = worksheet.name;
        tableau.extensions.settings.set('sheet', worksheetName);

        tableau.extensions.settings.saveAsync().then(function () {
          // Close the dialog and show the data table for this worksheet
          $('#choose_sheet_dialog').modal('toggle');
          loadSelectedMarks(worksheetName);
        });
      });

      // Add our button to the list of worksheets to choose from
      $('#choose_sheet_buttons').append(button);
    });

    // Show the dialog
    $('#choose_sheet_dialog').modal('toggle');
  }


  // This variable will save off the function we can call to unregister
  // listening to marks-selected event
  let unregisterEventHandlerFunction;

  /** 
   * Get data from the api, format it and give forward it to setUpD3.
   */
  function loadSelectedMarks(worksheetName) {
    // Remove any existing event listeners
    if (unregisterEventHandlerFunction) {
      unregisterEventHandlerFunction();
    }

    // Get the worksheet object we want to get the selected marks for.
    const worksheet = getSelectedSheet(worksheetName);

    // Set our title to an appropriate value
    $('#selected_marks_title').text(worksheet.name);

    // Call to get the selected marks for our sheet.
    worksheet.getSelectedMarksAsync().then(function (marks) {
      // Get the first Data Table for our selected marks (usually there is just one)
      const worksheetData = marks.data[0];

      // Map our data into the format which the data table component expects it
      const data = worksheetData.data.map(function (row, index) {
        const rowData = row.map(function (cell) {
          return cell.formattedValue;
        });

        return rowData;
      });

      const columns = worksheetData.columns.map(function (column) {
        return { title: column.fieldName };
      });

      // testing
      console.log(data);
      console.log(columns);

      const formattedData = formatData(data, columns);
      console.log(formattedData);

      // Call this function if you want to put in data from the dashboard! 
      setUpD3Test(formattedData);
    });

    // Add an event listener for the selection changed event on this sheet.
    unregisterEventHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, function (selectionEvent) {
      // When the selection changes, reload the data
      loadSelectedMarks(worksheetName);
    });
  }


  /**
   * 
   */
  function setUpD3Test(data) {
    $('#no_data_message').css('display', 'none');
    // when the selection changes, we want to remove existing data from the viz.
    $('#d3_chart').empty();

    var outerWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    var outerHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    outerHeight -= 75;

    // Calculate width and height of the chart.
    var margin = { left: 50, top: 30, right: 30, bottom: 30 };
    var innerHeight = outerHeight - margin.top - margin.bottom;
    var innerWidth = outerWidth - margin.left - margin.right;

    // Prepare different columns in the visualisation
    var xcol = 'longitude';
    var ycol = 'latitude';
    var rcol = 'sum_sales';
    var ccol = 'sum_profit';
    var cols = { x: xcol, y: ycol , r: rcol, c: ccol };

    // Prepare scales.
    var xScale = d3.scale.linear().range([0, innerWidth]);
    var yScale = d3.scale.linear().range([innerHeight, 0]);
    var rScale = d3.scale.linear().range([2, 20]);
    var cScale = d3.scale.linear().range([0, 255]);
    var scales = { x: xScale, y: yScale, r: rScale, c: cScale };

    // Create svg element that will act as cointainer.
    var svg = d3.select('#d3_chart')
    .attr('width', outerWidth)
    .attr('height', outerHeight);

    // Within the svg element create a group for the visualization.
    var g = svg.append('g')
    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

    // Within the circles group element create two groups for the axis.
    var xAxisG = g.append('g')
    .attr('class', 'axis')
    .attr('transform', 'translate(0, ' + innerHeight + ')');
    var yAxisG = g.append('g')
    .attr('class', 'axis');

    // Create axis
    var xAxis = d3.svg.axis().scale(xScale).orient('bottom');
    var yAxis = d3.svg.axis().scale(yScale).orient('left');

    var axis = { x: xAxis, xg: xAxisG, y: yAxis, yg: yAxisG };

    // testing
    data.forEach(el => { console.log(el); });

    renderTest(data, g, scales, cols, axis);
  }

  /**
   * All of the rendering is done within this function.
   */
  function renderTest(data, g, scales, cols, axis) {
    // Set the domains of the scales.
    scales.x.domain(d3.extent(data, function (d) { return d[cols.x]; }));
    scales.y.domain(d3.extent(data, function (d) { return d[cols.y]; }));
    scales.r.domain(d3.extent(data, function (d) { return d[cols.r]; }));
    scales.c.domain(d3.extent(data, function (d) { return d[cols.c]; }));

    // Draw the axis.
    axis.xg.call(axis.x);
    axis.yg.call(axis.y);

    // Create a tooltip.
    var tooltip = d3.select('#tooltip')
    .append('div')
    .style('opacity', 0)
    .attr('class', 'tooltip')
    .style('background-color', 'white')
    .style('border', 'solid')
    .style('border-width', '2px')
    .style('border-radius', '5px')
    .style('padding', '5px');

    // functions for mouse events
    var mouseover = function(d) {
      tooltip
      .style('opacity', 1);
      d3.select(this)
      .style('stroke', 'black')
      .style('opacity', 1);
    }

    var mousemove = function(d) {
      tooltip
      .html('Country: ' + d.country + '<br>State: ' + d.state + 
        '<br>SUM(Sales): ' + d.sum_sales + '<br>SUM(Profit): ' + d.sum_profit)
      .style('left', (d3.mouse(this)[0]) + 'px')
      .style('top', (d3.mouse(this)[1] - 10) + 'px');
    }

    var mouseleave = function(d) {
      tooltip
      .style('opacity', 0);
      d3.select(this)
      .style('stroke', 'none')
      .style('opacity', 0.4)
      .style('left', '0px')
      .style('top', '0px');
    }

    // Add new circles.
    var circles = g.selectAll('circle').data(data);
    circles.enter().append('circle')
    .attr('opacity', 0.4)
    .attr('fill', function (d) { return getColor(d, scales.c, cols.c); })
    .attr('class', 'mark')
    .on('mouseover', mouseover)
    .on('mousemove', mousemove)
    .on('mouseleave', mouseleave);

    // Update circles.
    circles
    .attr('cx', function (d) { return scales.x(d[cols.x]); })
    .attr('cy', function (d) { return scales.y(d[cols.y]); })
    .attr('r', function (d) { return scales.r(d[cols.r]); });

    circles.exit().remove();
  }


  function getColor(d, cScale, ccol) {
    if (d[ccol] < 0) return 'red';
    return 'green';
  }


  /**
   * Changes data from string to float.
   */
  function type(d) {
    d.sepal_length = parseFloat(d.sepal_length);
    d.sepal_width = parseFloat(d.sepal_width);
    d.petal_length = parseFloat(d.petal_length);
    d.petal_width = parseFloat(d.petal_width);
    return d;
  }


  function createButton (buttonTitle) {
    const button =
    $(`<button type='button' class='btn btn-default btn-block'>
      ${buttonTitle}
    </button>`);

    return button;
  }
  

  function formatData(data, columns) {
    const formattedData = data.map(function (row) {
      var sales = parseFloat(row[3].replace(',', ''));
      var profit = parseFloat(row[2].replace(',', ''));
      const rowData = { country: row[0], state: row[1], sum_profit: profit, sum_sales: sales,
      latitude: +row[4], longitude: +row[5] };
      return rowData;
    });
    
    return formattedData;
  }


  function initializeButtons () {
    $('#show_choose_sheet_button').click(showChooseSheetDialog);
  }


  function getSelectedSheet (worksheetName) {
    // Go through all the worksheets in the dashboard and find the one we want
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }
})();
