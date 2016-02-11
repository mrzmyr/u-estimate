var app = angular.module('app', []);

app.constant('UBER_SERVER_KEY', 'PFWRIaJYlJvmtJtggKzw5hSpUzAzTAR816bb2e9q');

app.service('uberService', ['$http', '$q', 'UBER_SERVER_KEY', function ($http, $q, UBER_SERVER_KEY) {
  var base_api_url = 'https://api.uber.com/v1';

  function serializeOptions(options) {
    var url_params = [];
    for(var o in options) {
      url_params.push(o + '=' + options[o]);
    }
    return url_params.join('&');
  }

  var service = {
    getProducts: function () {
      var defer = $q.defer();

      $http({
        method: 'GET',
        url: base_api_url + '/products',
        headers: {
          'Authorization': 'Token ' + UBER_SERVER_KEY
        }
      })
      .success(defer.resolve)
      .error(defer.reject);

      return defer.promise;
    },

    getPriceEstimation: function (options) {
      var defer = $q.defer();

      $http({
        method: 'GET',
        url: base_api_url + '/estimates/price?' + serializeOptions(options),
        headers: {
          'Authorization': 'Token ' + UBER_SERVER_KEY
        }
      })
      .success(defer.resolve)
      .error(defer.reject);

      return defer.promise;
    },

    getTimeEstimation: function (options) {
      var defer = $q.defer();

      $http({
        method: 'GET',
        url: base_api_url + '/estimates/time?' + serializeOptions(options),
        headers: {
          'Authorization': 'Token ' + UBER_SERVER_KEY
        }
      })
      .success(defer.resolve)
      .error(defer.reject);

      return defer.promise;
    }
  };

  return service;
}]);

app.service('directionService', [function () {
  var directionsService = new google.maps.DirectionsService();
  var directionsDisplay = new google.maps.DirectionsRenderer();

  var service = {
    route: function (map, options) {
      directionsDisplay.setMap(map);
      directionsService.route(options, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          directionsDisplay.setDirections(response);
        }
      });
    }
  };

  return service;
}]);

app.directive('googleMapsAutocomplete', [function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var autocomplete = new google.maps.places.Autocomplete(element[0]);
    }
  };
}]);

app.directive('googleMap', [function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.app.map = new google.maps.Map(element[0], {
        panControl: false,
        zoomControl: false,
        scaleControl: false,
        streetViewControl: false,
        zoom: 7,
        center: new google.maps.LatLng(parseFloat(attrs.latitude), parseFloat(attrs.longitude))
      });
    }
  };
}]);

app.service('geocoderService',['$q', function($q) {
  var geocoder = new google.maps.Geocoder();

  var service = {
    geocode: function (options) {
      var defer = $q.defer();

      geocoder.geocode(options, function(results, status) {
        defer.resolve({
          latitude: results[0].geometry.location.lat(),
          longitude: results[0].geometry.location.lng()
        });
      }, defer.reject);

      return defer.promise;
    }
  };

  return service;
}]);

app.controller('appCtrl', ['geocoderService', 'directionService', 'uberService', '$q', function (geocoderService, directionService, uberService, $q) {

  this.estimate = function () {
    this.estimation = {};

    directionService.route(this.map, {
        origin: this.req.startAddress,
        destination: this.req.endAddress,
        travelMode: google.maps.TravelMode.DRIVING
    });

    var startPromise = geocoderService.geocode({ address: this.req.startAddress });
    var endPromise = geocoderService.geocode({ address: this.req.endAddress });

    $q.all([
      startPromise,
      endPromise
    ]).then(angular.bind(this, function (addresses) {

      this.error = null;

      var startAddress = addresses[0];
      var endAddress = addresses[1];

      var priceEstimationPromise = uberService.getPriceEstimation({
        start_latitude: startAddress.latitude,
        start_longitude: startAddress.longitude,
        end_latitude: endAddress.latitude,
        end_longitude: endAddress.longitude
      }).then(angular.bind(this, function (data) {
        angular.extend(this.estimation, data);
      }), angular.bind(this, function () {
        this.error = 'Error occured, may the distance was exceeded.';
      }));

      var priceEstimationPromise = uberService.getTimeEstimation({
        start_latitude: startAddress.latitude,
        start_longitude: startAddress.longitude,
      }).then(angular.bind(this, function (data) {
        angular.extend(this.estimation, data);
      }));
    }));
  };

}]);