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
     * @ngdoc controller
     * @name program-requisition-template.controller:RequisitionTemplateAdminController
     *
     * @description
     * Controller for template view page.
     */
    angular
        .module('program-requisition-template')
        .controller('RequisitionTemplateAdminController', RequisitionTemplateAdminController);

    RequisitionTemplateAdminController.$inject = [
        '$state', 'template', 'program', '$q', 'notificationService', 'messageService',
        'templateValidator', 'MAX_COLUMN_DESCRIPTION_LENGTH', 'COLUMN_SOURCES', 'TEMPLATE_COLUMNS',
        'loadingModalService'
    ];

    function RequisitionTemplateAdminController($state, template, program, $q, notificationService,
                                                messageService, templateValidator,
                                                MAX_COLUMN_DESCRIPTION_LENGTH, COLUMN_SOURCES,
                                                TEMPLATE_COLUMNS, loadingModalService) {

        var vm = this;

        /**
         * @ngdoc property
         * @propertyOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name maxColumnDescriptionLength
         * @type {Number}
         *
         * @description
         * Holds max column description length.
         */
        vm.maxColumnDescriptionLength = MAX_COLUMN_DESCRIPTION_LENGTH;

        /**
         * @ngdoc property
         * @propertyOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name template
         * @type {Object}
         *
         * @description
         * Holds template.
         */
        vm.template = template;

        /**
         * @ngdoc property
         * @propertyOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name program
         * @type {Object}
         *
         * @description
         * Holds program.
         */
        vm.program = program;

        vm.goToTemplateList = goToTemplateList;
        vm.saveTemplate = saveTemplate;
        vm.dropCallback = dropCallback;
        vm.canChangeSource = canChangeSource;
        vm.sourceDisplayName = sourceDisplayName;
        vm.isTemplateValid = templateValidator.isTemplateValid;
        vm.getColumnError = templateValidator.getColumnError;
        vm.isAverageConsumption = isAverageConsumption;

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name goToTemplateList
         *
         * @description
         * Redirects user to template list view page.
         */
        function goToTemplateList() {
            $state.go('openlmis.administration.programs');
        }

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name saveTemplate
         *
         * @description
         * Saves template from scope. After successful action displays
         * success notification on screen and redirects user to template
         * list view page. If saving is unsuccessful error notification is displayed.
         */
        function saveTemplate() {
            loadingModalService.open();
            vm.template.$save().then(function() {
                notificationService.success('adminProgramTemplate.templateSave.success');
                goToTemplateList();
            }, function() {
                notificationService.error('adminProgramTemplate.templateSave.failure');
            }).finally(loadingModalService.close);
        }

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name dropCallback
         *
         * @description
         * Moves column using templateFactory method. If action is unsuccessful
         * it displays notification error on screen.
         *
         * @param {Event}   event Drop event
         * @param {Number}  index Indicates where column was dropped
         * @param {Object}  item  Dropped column
         */
        function dropCallback(event, index, item) {
            if(!vm.template.$moveColumn(item, index)) {
                notificationService.error('adminProgramTemplate.canNotDropColumn');
            }
            return false; // disable default drop functionality
        }

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name canChangeSource
         *
         * @description
         * Indicates if column source can be changed based on canBeChanged property
         * and if there is more then one possible source to choose from.
         *
         * @param {Object} columnDefinition Contains info about how column can be manipulated by user
         */
        function canChangeSource(columnDefinition) {
            return columnDefinition.sources.length > 1;
        }

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name sourceDisplayName
         *
         * @description
         * Gives display name of given source type.
         *
         * @param  {String} name Column source name
         * @return {String}      Column source display name
         */
        function sourceDisplayName(name) {
            return messageService.get(COLUMN_SOURCES.getLabel(name));
        }

        /**
         * @ngdoc method
         * @methodOf program-requisition-template.controller:RequisitionTemplateAdminController
         * @name isAverageConsumption
         *
         * @description
         * Determines whether displayed column is an average consumption.
         *
         * @param  {Object}  column Column
         * @return {Boolean}        True if column name is averageConsumption.
         */
        function isAverageConsumption(column) {
            return column.name === TEMPLATE_COLUMNS.AVERAGE_CONSUMPTION;
        }
    }
})();
