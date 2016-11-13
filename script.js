let map;
// Create a new blank array for all the listing markers.
let markers = [];

// Locations that will be shown to the user.
let locations = [{
    title: '432 Park Avenue',
    location: {
        lat: 40.7713024,
        lng: -73.9632393
    }
}, {
    title: '508 West 24th Street',
    location: {
        lat: 40.7444883,
        lng: -73.9949465
    }
}, {
    title: 'Union Square, Manhattan',
    location: {
        lat: 40.7347062,
        lng: -73.9895759
    }
}, {
    title: 'East Village, Manhattan',
    location: {
        lat: 40.7281777,
        lng: -73.984377
    }
}, {
    title: 'Tribeca',
    location: {
        lat: 40.7195264,
        lng: -74.0089934
    }
}, {
    title: 'Chinatown, Manhattan',
    location: {
        lat: 40.7180628,
        lng: -73.9961237
    }
}];

function CenterControl(controlDiv, map) {

    // Set CSS for the control border.
    let controlUI = document.createElement('div');
    controlUI.classList.add("displayLocations")
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior.
    let controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Arial, sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = 'Toggle Side Menu';
    controlUI.appendChild(controlText);

    // Add click event for display side menu
    controlUI.addEventListener('click', function(e) {
        let sideMenu = document.querySelector(".sideMenu");
        if (sideMenu.style.display == "block") {
            sideMenu.style.display = "none";
        } else {
            sideMenu.style.display = "block";
            sideMenu.style.position = "absolute";
            sideMenu.style.zIndex = "1";
            sideMenu.style.bottom = "0";
            sideMenu.style.width = "100vw"
        }
    });

}

function initMap() {

    // Constructor creates a new map
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 40.7413549,
            lng: -73.9980244
        },
        zoom: 13
    });
    let centerControlDiv = document.createElement('div');
    let centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

    ko.applyBindings(new ViewModel());
}

let ViewModel = function() {

    let self = this;
    self.markerTitle = ko.observable();
    let largeInfowindow = new google.maps.InfoWindow();

    let bounds = new google.maps.LatLngBounds();

    //Set marker color
    let pinColor = "FE7569";
    let pinImage = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34));

    self.setLocations = ko.observableArray(locations);

    self.setMarker = function(clickedMarker) {
        populateInfoWindow(clickedMarker.marker, largeInfowindow);
        markerToggle(clickedMarker.marker, largeInfowindow);
        toggleBounce(clickedMarker.marker, largeInfowindow);
    };

    // Uses the location array to create an array of markers on initialize.
    for (let i = 0; i < this.setLocations().length; i++) {
        // Get the position and title from the location array.
        let position = this.setLocations()[i].location;
        let title = this.setLocations()[i].title;
        // Create a marker per location, and put into markers array.
        let marker = new google.maps.Marker({
            map: map,
            position: position,
            title: title,
            animation: google.maps.Animation.DROP,
            icon: pinImage,
            id: i,
        });
        self.setLocations()[i].marker = marker;
        // Push the marker to our array of markers.
        markers.push(marker);
        // Create an onclick event to open an infowindow at each marker.
        marker.addListener('click', function() {
            populateInfoWindow(this, largeInfowindow);
            markerToggle(this, largeInfowindow);
            toggleBounce(this, largeInfowindow);
        });
        bounds.extend(markers[i].position);
    }

    // Extend the boundaries of the map for each marker
    map.fitBounds(bounds);

    // Keep track of the user Input
    self.userInput = ko.observable('');
    // Array containing markers based on the filter
    self.markerFilter = ko.observableArray();
    self.setLocations().forEach(function(place) {
        self.markerFilter.push(place);
    });
    self.filterMarkers = function() {

        // Set all markers and places to not visible.
        let searchInput = self.userInput().toLowerCase();
        self.markerFilter.removeAll();
        self.setLocations().forEach(function(place) {
            place.marker.setVisible(false);

            // Compare the name of each place to user input
            // If user input is included in the name, set the place and marker as visible
            if (place.title.toLowerCase().indexOf(searchInput) !== -1) {
                self.markerFilter.push(place);
            }
        });
        self.markerFilter().forEach(function(place) {
            place.marker.setVisible(true);
        });
    };
};

// This function will be called when a marker is clicked opening an infowindow and setting content to it

function populateInfoWindow(marker, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {

        infowindow.marker = marker;
        let streetViewService = new google.maps.StreetViewService();
        let radius = 50;

        function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                let nearStreetViewLocation = data.location.latLng;
                let heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                let panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 30
                    }
                };
                let wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
                $.ajax({
                        url: wikiUrl,
                        dataType: "jsonp"
                    })
                    .done(function(response) {
                        let articleList = response[3][0];
                        infowindow.setContent('<div><a target="blank" class="highlighted" href=' + articleList +
                            '> Wikipedia article: ' + marker.title + '</a></div><div id="pano"></div>');
                        let panorama = new google.maps.StreetViewPanorama(
                            document.getElementById('pano'), panoramaOptions);
                    })
                    .fail(function(error)  {
                        alert("Sorry there has been an error. Try later :(");
                    });
            } else {
                infowindow.setContent('<div>' + marker.title + '</div>' +
                    '<div>No Street View Found</div>');
            }
        }

        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);

        infowindow.open(map, marker);

    }
}

function markerToggle(marker, infowindow) {
    let pinColor = "FE7569";
    let normalIcon = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|" + pinColor,
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34));
    for (let i = 0; i < markers.length; i++) {
        markers[i].setIcon(normalIcon);
    }
    let selectedIcon = new google.maps.MarkerImage("http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|00E676",
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34));
    marker.setIcon(selectedIcon);
    infowindow.addListener('closeclick', function() {
        marker.setIcon(normalIcon);
    });
}

// Animates markers when clicked
function toggleBounce(marker, infowindow) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setAnimation(null);
    }
    infowindow.addListener('closeclick', function() {
        marker.setAnimation(null);
    });
    marker.setAnimation(google.maps.Animation.BOUNCE);
}

function googleError() {
    return alert("There has been a problem loading google Maps. Try again later!");
}
