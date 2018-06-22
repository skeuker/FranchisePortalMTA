sap.ui.define([
	'pnp/co/za/FranchisePortalAdmin/controller/Base.controller',
	"sap/ui/model/json/JSONModel",
	"pnp/co/za/FranchisePortalOrdering/uuid"
], function(BaseController, JSONModel, uuid) {
	"use strict";
	return BaseController.extend("pnp.co.za.FranchisePortalAdmin.controller.EventsList", {
		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		onInit: function() {

			//initialize controller
			this.initialize();

			//set model to smart table as direct model connection is required
			this.byId("eventsSmartTable").setModel(this.oODataModel);

			//attach view to this OData Model
			this.getView().setModel(this.i18nModel, "i18n");
			this.getView().setModel(this.oODataModel);

		},

		//on before export of events list
		onBeforeExportEventsList: function(oEvt) {

			//get smart table setting for export to Excel
			var mExcelSettings = oEvt.getParameter("exportSettings");
			// GW export
			if (mExcelSettings.url) {
				return;
			}
			// For UI5 Client Export --> The settings contains sap.ui.export.SpreadSheet relevant settings that be used to modify the output of excel

			// Disable Worker as Mockserver is used in explored --> Do not use this for real applications!
			mExcelSettings.worker = false;

		},

		//on click events table row
		onPressEventsListItem: function(oEvent) {

			//prepare object path to be passed on to target
			var oListItem = oEvent.getParameter("listItem");

			//get binding context of this event
			var oEvent = oListItem.getBindingContext().getObject();

			//navigate to event display
			this.getRouter().getTargets().display("Event", {
				"eventID": oEvent.eventID
			});

		},

		//on personalise events list button click
		onEventsListPersonalisationClick: function() {

			//open table personalisation dialog
			this.getView().byId("eventsSmartTable").openPersonalisationDialog("Columns");

		},

		//on press events list download
		onPressEventsListDownload: function(oEvent) {
			if (oEvent) {

			}
		},

		//on change of smart filter variant
		onAssignedFiltersChanged: function(oEvent) {
			
			//retrieve new variant value
			var oStatusText = sap.ui.getCore().byId(this.getView().getId() + "--statusText");
			var oFilterBar = sap.ui.getCore().byId(this.getView().getId() + "--smartFilterBar");
			if (oStatusText && oFilterBar) {
				var sText = oFilterBar.retrieveFiltersWithValuesAsText();
				oStatusText.setText(sText);
			}
			
		}

	});

});