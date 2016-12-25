var myApp = angular.module("myApp", ["myk.videochat"]);

myApp.directive("videoChat", ["VideoChat", function(VideoChat) {

    return {
        restrict: "E",
        scope: {
            session:"@"
        },
        template: "<div><video></video><video></video></div>",
        link: function(scope, element) {
            scope.status = "dormant";
            var localVideoElements = element.find('video');
            var lv1 = localVideoElements[0];
            var rv1 = localVideoElements[1];

            var socketURL = "ws://" + window.location.host + "/videoSocket/" + scope.session;
            console.log("Connecting to websocket: " + socketURL);
            var vs = new WebSocket(socketURL);

            scope.status = "initializing";

            vs.onopen = function() {
                console.log("Connected to video socket!");
                scope.status = "connected, waiting for peer";
                scope.$apply();
                VideoChat(lv1, rv1, vs);
            };

        }
    };
}])