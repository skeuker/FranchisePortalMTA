sap.ui.define([
	"sap/ui/core/util/MockServer"
], function(MockServer) {
	"use strict";
	return {
		init: function() {

			// create
			var oMockServer = new MockServer({
				rootUri: "/xsjs/xsodata/FranchisePortal.xsodata/" //ensure to have ending forward slash, else OData requests will not be intercepted
			});
			var oUriParameters = jQuery.sap.getUriParameters();

			// configure
			MockServer.config({
				autoRespond: true,
				respondImmediately: true,
				autoRespondAfter: oUriParameters.get("serverDelay") || 1000
			});

			// simulate
			var sPath = jQuery.sap.getModulePath("pnp.co.za.FranchisePortalOrdering.localService");
			oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");

			// start
			oMockServer.start();

		}

	};

});