/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */

(function() {

    'use strict';

    /**
     * @ngdoc service
     * @name requisition-batch-approval.requisitionBatchApprovalService
     *
     * @description
     * Responsible for retrieving all information from server.
     */
    angular
        .module('requisition-batch-approval')
        .service('requisitionBatchApprovalService', service);

    service.$inject = ['$q', '$resource',  'requisitionUrlFactory', 'localStorageFactory', 'offlineService'];

    function service($q, $resource, requisitionUrlFactory, localStorageFactory, offlineService) {

        var offlineRequisitions = localStorageFactory('batchApproveRequisitions');

        var resource = $resource(requisitionUrlFactory('/api/requisitions?retrieveAll'), {}, {
            'get': {
                method: 'GET'
            },
            'saveAll': {
                method: 'PUT',
                url: requisitionUrlFactory('/api/requisitions?saveAll')
            },
            'approveAll': {
                method: 'POST',
                url: requisitionUrlFactory('/api/requisitions?approveAll')
            }
        });

        var service = {
            get: get,
            saveAll: saveAll,
            approveAll: approveAll
        };

        return service;

        /**
         * @ngdoc method
         * @methodOf requisition-batch-approval.requisitionBatchApprovalService
         * @name get
         *
         * @description
         * Retrieves requisitions by ids.
         *
         * @param  {String}  ids Requisition UUIDs
         * @return {Promise}    requisition promise
         */
        function get(ids) {
            var deferred = $q.defer(),
                idsArray = [],
                offlineResponse = [];

            if (offlineService.isOffline()) {

                angular.forEach(ids, function(id) {
                    var requisition = offlineRequisitions.getBy('id', id);
                    if(!requisition) {
                        deferred.reject();
                    } else {
                        offlineResponse.push(requisition);
                    }
                });

                deferred.resolve(offlineResponse);
            } else {

                angular.forEach(ids, function(id) {
                    var requisition = offlineRequisitions.search({
                        id: id,
                        $modified: true
                    });
                    if (!requisition || !requisition.length) {
                        idsArray.push(id);
                    } else {
                        offlineResponse.push(requisition[0]);
                    }
                });

                if (idsArray.length > 0) {
                    getRequisitions(idsArray).then(function(response) {
                        var requisitionDtos = response.requisitionDtos;

                        angular.forEach(requisitionDtos, function(requisitionDto) {
                            saveToLocalStorage(requisitionDto);
                        });
                        requisitionDtos = requisitionDtos.concat(offlineResponse);
                        deferred.resolve(requisitionDtos);
                    }, deferred.reject);
                } else {
                    deferred.resolve(offlineResponse);
                }

            }

            return deferred.promise;
        }

        function saveAll(requisitions) {
            return resource.saveAll(requisitions).$promise;
        }

        function approveAll(ids) {
            return resource.approveAll({id: ids.join(',')}, {}).$promise;
        }

        function getRequisitions(ids) {
            return resource.get({id: ids.join(',')}).$promise;
        }

        function saveToLocalStorage(requisition) {
            requisition.$availableOffline = true;
            requisition.$modified = false;
            offlineRequisitions.put(requisition);
        }
    }
})();