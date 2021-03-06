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
     * @name requisition.requisitionService
     *
     * @description
     * Responsible for retrieving all information from server.
     */
    angular
        .module('requisition')
        .service('requisitionService', service);

    service.$inject = [
        '$q', '$resource', 'messageService', 'openlmisUrlFactory', 'requisitionUrlFactory',
        'Requisition', 'dateUtils', 'localStorageFactory', 'offlineService', 'paginationFactory',
        'PAGE_SIZE', '$filter'
    ];

    function service($q, $resource, messageService, openlmisUrlFactory, requisitionUrlFactory,
                     Requisition, dateUtils, localStorageFactory, offlineService, paginationFactory,
                     PAGE_SIZE, $filter) {

        var offlineRequisitions = localStorageFactory('requisitions'),
            offlineBatchRequisitions = localStorageFactory('batchApproveRequisitions'),
            onlineOnlyRequisitions = localStorageFactory('onlineOnly'),
            offlineStatusMessages = localStorageFactory('statusMessages');

        var resource = $resource(requisitionUrlFactory('/api/requisitions/:id'), {}, {
            'get': {
                method: 'GET',
                transformResponse: transformGetResponse
            },
            'initiate': {
                url: requisitionUrlFactory('/api/requisitions/initiate'),
                method: 'POST'
            },
            'search': {
                url: requisitionUrlFactory('/api/requisitions/search'),
                method: 'GET',
                transformResponse: transformRequisitionSearchResponse
            },
            'forApproval': {
                url: requisitionUrlFactory('/api/requisitions/requisitionsForApproval'),
                method: 'GET',
                transformResponse: transformRequisitionListResponse
            },
            'forConvert': {
                url: requisitionUrlFactory('/api/requisitions/requisitionsForConvert'),
                method: 'GET',
                transformResponse: transformResponseForConvert
            },
            'convertToOrder': {
                url: requisitionUrlFactory('/api/requisitions/convertToOrder'),
                method: 'POST',
                transformRequest: transformRequest
            },
            'getStatusMessages': {
                url: requisitionUrlFactory('/api/requisitions/:id/statusMessages'),
                method: 'GET',
                isArray: true
            }
        });

        var service = {
            get: get,
            initiate: initiate,
            search: search,
            forApproval: forApproval,
            forConvert: forConvert,
            convertToOrder: convertToOrder,
            removeOfflineRequisition: removeOfflineRequisition
        };

        return service;

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name get
         *
         * @description
         * Retrieves requisition by id.
         *
         * @param  {String}  id Requisition UUID
         * @return {Promise}    requisition promise
         */
        function get(id) {
            var deferred = $q.defer(),
                requisition,
                statusMessages;

            if (offlineService.isOffline()) {
                requisition = getOfflineRequisition('id', id);

                if (!requisition) {
                    error();
                }
                else {
                    statusMessages = offlineStatusMessages.search({
                        requisitionId: requisition.id
                    });
                    resolve(requisition, statusMessages);
                }
            } else {
                requisition = offlineRequisitions.search({
                    id: id,
                    $modified: true
                });
                if (!requisition || !requisition.length) {
                    getRequisition(id).then(function(requisition) {
                        filterRequisitionStockAdjustmentReasons(requisition);

                        requisition.$availableOffline = !onlineOnlyRequisitions.contains(id);
                        getStatusMessages(requisition).then(function(response) {
                            if (requisition.$availableOffline) {
                                storeResponses(requisition, response);
                            }
                            resolve(requisition, response);
                        }, function() {
                            if (requisition.$availableOffline) {
                                offlineRequisitions.put(requisition);
                            }
                            resolve(requisition);
                        });
                    }, error);
                } else {
                    statusMessages = offlineStatusMessages.search({
                            requisitionId: requisition[0].id
                        });

                    resolve(requisition[0], statusMessages);
                }
            }

            return deferred.promise;

            function resolve(requisition, statusMessages) {
                deferred.resolve(new Requisition(requisition, statusMessages));
            }

            function error() {
                deferred.reject();
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name initiate
         *
         * @description
         * Initiates new requisition for program in facility with given period.
         *
         * @param  {String}  facility        Facility UUID
         * @param  {String}  program         Program UUID
         * @param  {String}  suggestedPeriod Period UUID
         * @param  {Boolean} emergency       Indicates if requisition is emergency or not
         * @return {Promise}                 requisition promise
         */
        function initiate(facility, program, suggestedPeriod, emergency) {
            return resource.initiate({
                facility: facility,
                program: program,
                suggestedPeriod: suggestedPeriod,
                emergency: emergency
            }, {}).$promise
            .then(function(requisition) {
                filterRequisitionStockAdjustmentReasons(requisition);
                requisition.$modified = true;
                requisition.$availableOffline = true;
                offlineRequisitions.put(requisition);
                return requisition;
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name search
         *
         * @description
         * Search requisitions by criteria from parameters.
         *
         * @param {Boolean} offline      Indicates if searching in offline requisitions
         * @param {Object}  searchParams Contains parameters for searching requisitions, i.e.
         * {
         *      program: 'programID',
         *      facility: 'facilityID',
         *      initiatedDateFrom: 'startDate',
         *      initiatedDateTo: 'endDate',
         *      requisitionStatus: ['status1', 'status2'],
         *      emergency: false
         * }
         * @return {Array}               Array of requisitions for given criteria
         */
        function search(offline, searchParams) {
            var deferred = $q.defer();

            if(offline) {
                var requisitions = offlineRequisitions.search(searchParams, 'requisitionSearch'),
                    batchRequisitions = searchParams.showBatchRequisitions ?
                        offlineBatchRequisitions.search(searchParams.program, 'requisitionSearch') : [],
                    page = searchParams.page,
                    size = searchParams.size,
                    sort = searchParams.sort;

                angular.forEach(batchRequisitions, function(batchRequisition) {
                    if ($filter('filter')(requisitions, {id: batchRequisition.id}).length === 0) {
                        requisitions.push(batchRequisition);
                    }
                });

                var items = paginationFactory.getPage(requisitions, page, size);

                deferred.resolve({
                    content: items,
                    number: page,
                    totalElements: requisitions.length,
                    size: size,
                    sort: sort
                });
            } else {
                return resource.search(searchParams).$promise;
            }

            return deferred.promise;
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name forApproval
         *
         * @description
         * Retrieves all requisitions with authorized status for approve.
         *
         * @return {Array} Array of requisitions for approval
         */
        function forApproval(params) {
            return resource.forApproval(params).$promise;
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name forConvert
         *
         * @description
         * Search requisitions for convert to order by given criteria.
         *
         * @param  {Object} params Request params, contains i.e.: filterBy, filterValue, sortBy, descending
         * @return {Array}         Array of requisitions for convert
         */
        function forConvert(params) {
            return resource.forConvert(params).$promise;
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name convertToOrder
         *
         * @description
         * Converts given requisitions into orders.
         *
         * @param {Array} requisitions Array of requisitions to convert
         */
        function convertToOrder(requisitions) {
            var promise = resource.convertToOrder(requisitions).$promise;
            promise.then(function(response) {
                angular.forEach(requisitions, function(requisition) {
                    offlineRequisitions.removeBy('id', requisition.requisition.id);
                });
            });
            return promise;
        }

        /**
         * @ngdoc method
         * @methodOf requisition.requisitionService
         * @name removeOfflineRequisition
         *
         * @description
         * Removes a specific requistion from the offline store.
         *
         * @param {String} requisitionId Id of requisition to remove
         */
        function removeOfflineRequisition(requisitionId) {
            offlineRequisitions.removeBy('id', requisitionId);
        }

        function getRequisition(id) {
            return resource.get({
                id: id
            }).$promise;
        }

        function getOfflineRequisition(id) {
            return offlineRequisitions.getBy('id', id);
        }

        function getStatusMessages(requisition) {
            return resource.getStatusMessages({
                id: requisition.id
            }).$promise;
        }

        function storeResponses(requisition, statusMessages) {
            requisition.$modified = false;
            offlineRequisitions.put(requisition);

            statusMessages.forEach(function(statusMessage) {
                offlineStatusMessages.put(statusMessage);
            });
        }

        function transformRequest(requisitionsWithDepots) {
            var body = [];
            angular.forEach(requisitionsWithDepots, function(requisitionWithDepots) {
                body.push({
                    requisitionId: requisitionWithDepots.requisition.id,
                    supplyingDepotId: requisitionWithDepots.requisition.supplyingFacility
                });
            });
            return angular.toJson(body);
        }

        function transformGetResponse(data, headers, status) {
            return transformResponse(data, status, function(response) {
                if (response.processingPeriod.startDate) {
                    response.processingPeriod.startDate = dateUtils.toDate(response.processingPeriod.startDate);
                }
                if (response.processingPeriod.endDate) {
                    response.processingPeriod.endDate = dateUtils.toDate(response.processingPeriod.endDate);
                }
                return response;
            });
        }

        function transformRequisitionSearchResponse(data, headers, status) {
            return transformResponse(data, status, function(response) {
                angular.forEach(response.content, transformRequisition);
                return response;
            });
        }

        function transformRequisitionListResponse(data, headers, status) {
            return transformResponse(data, status, function(response) {
                angular.forEach(response.content, transformRequisition);
                return response;
            });
        }

        function transformResponseForConvert(data, headers, status) {
            return transformResponse(data, status, function(response) {
                angular.forEach(response.content, function(item) {
                    transformRequisition(item.requisition);
                });
                return response;
            });
        }

        function transformResponse(data, status, transformer) {
            if (status === 200) {
                return transformer(angular.fromJson(data));
            }
            return data;
        }

        function transformRequisition(requisition) {
            if(requisition.modifiedDate) {
                requisition.modifiedDate = dateUtils.toDate(requisition.modifiedDate);
            }

            if (requisition.createdDate) {
                requisition.createdDate = dateUtils.toDate(requisition.createdDate);
            }

            requisition.processingPeriod.startDate = dateUtils.toDate(
                requisition.processingPeriod.startDate
            );

            requisition.processingPeriod.endDate = dateUtils.toDate(
                requisition.processingPeriod.endDate
            );

            if (requisition.processingPeriod.processingSchedule) {
                requisition.processingPeriod.processingSchedule.modifiedDate = dateUtils.toDate(
                    requisition.processingPeriod.processingSchedule.modifiedDate
                );
            }

            transformRequisitionOffline(requisition);
        }

        function transformRequisitionOffline(requisition) {
            var offlineRequisition = offlineRequisitions.getBy('id', requisition.id),
                offlineBatchRequisition = offlineBatchRequisitions.getBy('id', requisition.id);

            if (offlineRequisition || offlineBatchRequisition) {
                requisition.$availableOffline = true;
            }

            if(requisition.modifiedDate && requisition.modifiedDate.getTime) {

                if (offlineRequisition) {
                    markIfOutdated(requisition, offlineRequisition);
                    offlineRequisitions.put(offlineRequisition);
                }

                if (offlineBatchRequisition) {
                    markIfOutdated(requisition, offlineBatchRequisition);
                    offlineBatchRequisitions.put(offlineBatchRequisition);
                }
            }
        }

        function markIfOutdated(requisition, offlineRequisition) {
            var offlineDate = dateUtils.toDate(offlineRequisition.modifiedDate);

            if(!offlineDate || offlineDate.getTime() !== requisition.modifiedDate.getTime()) {
                offlineRequisition.$outdated = true;
            } else {
                delete offlineRequisition.$outdated;
            }
        }

        function filterRequisitionStockAdjustmentReasons(requisition) {
            requisition.stockAdjustmentReasons =  $filter('filter')(
                requisition.stockAdjustmentReasons, {
                    hidden: '!true'
                }
            );
        }
    }
})();
