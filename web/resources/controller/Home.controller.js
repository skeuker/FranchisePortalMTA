sap.ui.define([
		'pnp/co/za/FranchisePortalOrdering/controller/Base.controller',
		'sap/ui/model/json/JSONModel',
		'sap/ui/Device'
	], function (BaseController, JSONModel, Device) {
		"use strict";
		return BaseController.extend("pnp.co.za.FranchisePortalOrdering.controller.Home", {
			
			//initialize controller
			onInit: function () {
				var oViewModel = new JSONModel({
					isPhone : Device.system.phone
				});
				this.setModel(oViewModel, "view");
				Device.media.attachHandler(function (oDevice) {
					this.getModel("view").setProperty("/isPhone", oDevice.name === "Phone");
				}.bind(this));
			},
			
			//access events list
			onPressEventsLink: function(){
				this.getRouter().navTo("EventsList");
			}
		});
});