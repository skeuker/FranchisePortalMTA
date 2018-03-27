sap.ui.define([
	'pnp/co/za/FranchisePortalOrdering/controller/Base.controller',
	'sap/ui/model/json/JSONModel',
	'sap/ui/Device'
], function(BaseController, JSONModel, Device) {
	"use strict";
	return BaseController.extend("pnp.co.za.FranchisePortalOrdering.controller.Preferences", {

		//initialize controller
		onInit: function() {
			
			//initialize this controller
			this.initialize();
			
			//attach listener to display of 'Preferences' target
			this.getRouter().getTarget("Preferences").attachDisplay(this.onDisplay, this);
		
		},
		
		//on view display
		onDisplay: function(){
			
			//set store from preferences
			this.getView().byId("inputRoleAttributeStoreID").setValue(this.getOwnerComponent().oUserContext.roleAttributes.StoreID.toString());

		}

	});

});