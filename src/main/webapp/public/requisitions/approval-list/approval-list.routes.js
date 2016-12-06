(function() {

	'use strict';

	angular.module('openlmis.requisitions').config(routes);

	routes.$inject = ['$stateProvider', 'RequisitionRights'];

	function routes($stateProvider, RequisitionRights) {

		$stateProvider.state('requisitions.approvalList', {
			showInNavigation: true,
			label: 'link.requisition.approve',
			url: '/approvalList',
			controller: 'ApprovalListCtrl',
			templateUrl: 'requisitions/approval-list/approval-list.html',
			accessRight: RequisitionRights.REQUISITION_APPROVE,
			resolve: {
		        requisitionList: function (RequisitionService) {
                    return RequisitionService.forApproval();
		        }
		    }
		});

	}

})();
