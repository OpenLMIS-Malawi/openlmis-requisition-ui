describe('orderService', function() {

    var orderService, $rootScope, $httpBackend, fulfillmentUrlFactory, orders, transformedOrders;

    beforeEach(function() {
        module('order');

        inject(function($injector) {
            $rootScope = $injector.get('$rootScope');
            $httpBackend = $injector.get('$httpBackend');
            orderService = $injector.get('orderService');
            fulfillmentUrlFactory = $injector.get('fulfillmentUrlFactory');
        });

        orders = [{
            id: 'id-one',
            processingPeriod: {
                startDate: [2017, 1, 1],
                endDate: [2017, 1, 31]
            }
        }, {
            id: 'id-two',
            processingPeriod: {
                startDate: [2017, 2, 1],
                endDate: [2017, 2, 27]
            }
        }];

        $httpBackend.when('GET', fulfillmentUrlFactory('/api/orders/search?supplyingFacility=some-id'))
            .respond(200, orders);
    });

    it('search should return transformed orders', function() {
        var result;

        orderService.search({
            supplyingFacility: 'some-id'
        }).then(function(orders) {
            result = orders;
        });

        $httpBackend.flush();
        $rootScope.$apply();

        expect(result[0].id).toEqual('id-one');
        expect(result[0].processingPeriod.startDate).toEqual(new Date(2017, 0, 1));
        expect(result[0].processingPeriod.endDate).toEqual(new Date(2017, 0, 31));

        expect(result[1].id).toEqual('id-two');
        expect(result[1].processingPeriod.startDate).toEqual(new Date(2017, 1, 1));
        expect(result[1].processingPeriod.endDate).toEqual(new Date(2017, 1, 27));

    });

    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

});
