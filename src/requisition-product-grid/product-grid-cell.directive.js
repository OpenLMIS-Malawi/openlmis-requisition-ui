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
     * @ngdoc directive
     * @restrict A
     * @name requisition-product-grid.productGridCell
     *
     * @description
     * Responsible for rendering the product grid cell based on the column source and requisitions type.
     * It also keeps track of the validation as well as changes made to the related cells.
     *
     * @example
     * Here we extend our product grid cell with the directive.
     * ```
     * <td ng-repeat="column in visibleColumns | orderBy : 'displayOrder'" product-grid-cell></td>
     * ```
     */
    angular
        .module('requisition-product-grid')
        .directive('productGridCell', productGridCell);

    productGridCell.$inject = [
        '$q', '$timeout', '$templateRequest', '$compile', 'requisitionValidator', 'authorizationService',
        'TEMPLATE_COLUMNS', 'COLUMN_TYPES', 'REQUISITION_RIGHTS'
    ];

    function productGridCell($q, $timeout, $templateRequest, $compile, requisitionValidator, authorizationService,
                            TEMPLATE_COLUMNS, COLUMN_TYPES, REQUISITION_RIGHTS) {

        return {
            restrict: 'A',
            link: link,
            scope: {
                requisition: '=',
                column: '=',
                lineItem: '='
            }
        };

        function link(scope, element) {
            var requisition = scope.requisition,
                column = scope.column,
                lineItem = scope.lineItem;

            scope.lineItem = lineItem;
            scope.column = column;
            scope.validate = validate;
            scope.update = update;
            scope.isReadOnly = isReadOnly();
            scope.canNotSkip = canNotSkip();

            if(!scope.isReadOnly){
                scope.$watch(function(){
                    return lineItem[column.name];
                }, function(newValue, oldValue) {
                    if (newValue !== oldValue) {
                        lineItem.updateDependentFields(column, requisition);
                    }
                });
            }

            scope.$watch(function(){
                if(lineItem.skipped){
                    return false;
                }
                return lineItem.$errors[column.name];
            }, function(error){
                scope.invalidMessage = error ? error : undefined;
            });

            scope.$on('openlmisInvalid.update', validate);

            updateCellContents();

            function updateCellContents(){
                var templateUrl = '';
                if(column.name === TEMPLATE_COLUMNS.SKIPPED) {
                    templateUrl = 'requisition-product-grid/product-grid-cell-skip.html';
                } else if(column.name === TEMPLATE_COLUMNS.TOTAL_LOSSES_AND_ADJUSTMENTS) {
                    templateUrl = 'requisition-product-grid/product-grid-cell-total-losses-and-adjustments.html';
                } else if(column.$type === COLUMN_TYPES.NUMERIC && !scope.isReadOnly){
                    templateUrl = 'requisition-product-grid/product-grid-cell-input-numeric.html';
                } else if(!scope.isReadOnly) {
                    templateUrl = 'requisition-product-grid/product-grid-cell-input-text.html';
                } else if(column.$type === COLUMN_TYPES.CURRENCY) {
                    templateUrl = 'requisition-product-grid/product-grid-cell-currency.html';
                } else {
                    templateUrl = 'requisition-product-grid/product-grid-cell-text.html'
                }
                $templateRequest(templateUrl).then(replaceCell);
            }

            function replaceCell(newTemplate) {
                var cellWrapperPath = 'requisition-product-grid/product-grid-cell.html';
                $templateRequest(cellWrapperPath).then(function(template){
                    template = angular.element(template);
                    template.html(newTemplate);

                    var cell = $compile(template)(scope);
                    element.replaceWith(cell);

                    element = cell;
                });
            }

            function update() {
                lineItem.updateDependentFields(column, requisition);
                validate();
            }

            function validate() {
                return requisitionValidator.validateLineItem(
                    scope.lineItem,
                    requisition.template.getColumns(!scope.lineItem.$program.fullSupply),
                    requisition
                );
            }

            function isReadOnly() {
                return lineItem.isReadOnly(requisition, column);
            }

            function canNotSkip() {
                return !requisition.$isInitiated() && !requisition.$isRejected() &&
                    !(hasAuthorizeRightForProgram() && requisition.$isSubmitted()) ||
                    !lineItem.canBeSkipped(scope.requisition);
            }

            function hasAuthorizeRightForProgram() {
                return authorizationService.hasRight(REQUISITION_RIGHTS.REQUISITION_AUTHORIZE, {
                    programCode: requisition.program.code
                });
            }

        }
    }

})();
