
(function(){
    "use strict";

    /**
     *
     * @module openlmis-common
     *
     * @description
     * OpenLMIS Common module is a place for core functionality used within the OpenLMIS-UI application. Items within this module define common behavior and services that are used in other OpenLMIS-UI modules. To extend or replace any of these modules, see the extemtion guide.
     * 
     */
    angular.module('openlmis-core', [
        'openlmis.services',
        'angular-google-analytics',
        'openlmis.localStorage',
        'openlmis-templates',
        'ui.directives',
        'ngCookies',
        'ngRoute'
        ]);

})();
