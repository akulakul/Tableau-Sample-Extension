$(document).ready(function () {

    // Hook up an event handler for the load button click.
    // Wait to initialize until the button is clicked.
    $("#initializeButton").click(function () {

        $("#initializeButton").prop('disabled', true);

        tableau.extensions.initializeAsync().then(function () {

            // Initialization succeeded, get the dashboard.
            var dashboard = tableau.extensions.dashboardContent.dashboard;

            // Display the name of the dashboard in the UI
            $("#resultBox").html("I'm running in a dashboard named <strong>" + dashboard.name + "</strong>");
        }, function (err) {

            // sum ting wong  in initialization
            $("#resultBox").html("Error while initializing: " + err.toString());
        });
    });
});