sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function(UI5Object, MessageBox, JSONModel) {
	"use strict";

	/**
	 * @class ErrorHandler
	 * @description Handles application errors by automatically attaching to the model events and displaying errors when needed.
	 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
	 * @public
	 */
	return UI5Object.extend("pnp.co.za.FranchisePortalOrdering.controller.ErrorHandler", {

		/**
		 * @method Constructor
		 * @inner
		 */
		constructor: function(oComponent) {

			//initialize variables
			this.oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this.oComponent = oComponent;
			this.oModel = oComponent.getModel("FranchisePortal");
			this.bMessageOpen = false;
			this.sErrorText = this.oResourceBundle.getText("messageServiceErrorHasOccured");

			//attach to MetaDataFailed event of FranchisePortal OData model
			this.oModel.attachMetadataFailed(function(oEvent) {
				
				//get response content
				var oParams = oEvent.getParameters();
				
				//show metadata error dialog
				this.showMetadataError(oParams.response.message);
				
			}, this);

			//attach to request failure event
			this.oModel.attachRequestFailed(this.onRequestFailed, this);

		},

		/**
		 * Event Handler for Request Fail event
		 * The user can try to refresh the metadata.
		 * @param {object} oEvent an event containing the response data
		 * @private
		 */
		onRequestFailed: function(oEvent) {

			//get request failure context
			var oParams = oEvent.getParameters();

			// An entity that was not found in the service is also throwing a 404 error in oData.
			// We already cover this case with a notFound target so we skip it here.
			// A request that cannot be sent to the server is a technical error that we have to handle though
			if ((oParams.response.statusCode !== "404") || (oParams.response.statusCode === 404 &&
					oParams.response.responseText.indexOf("Cannot POST") === 0)) {
				this.showServiceError(oParams.response);
			}

		},

		/**
		 * @method showMetadataError
		 * @description Shows a {@link sap.m.MessageBox} when the metadata call has failed.
		 * @description The user can try to refresh the metadata.
		 * @param {string} sDetails a technical error to be displayed on request
		 * @private
		 */
		showMetadataError: function(sMessageDetails) {

			//get backend connection error message text
			var sMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("messageBackendConnectionErrorOccured");

			//construct default message details text where applicable
			if (!sMessageDetails) {
				sMessageDetails = this.oComponent.getModel("i18n").getResourceBundle().getText("messageMetaDataErrorOccured");
			}

			//show error dialog				
			this.oComponent.showErrorDialog(sMessage, sMessageDetails, "Backend or connection error occured");

		},

		/**
		 * Shows error dialog when a service call has failed.
		 * @param {object} oResponse a technical error to be displayed on request
		 * @private
		 */
		showServiceError: function(oResponse) {

			//local data declaration
			var sMessage;
			var sMessageDetails = "";

			//get backend connection error message text
			sMessage = this.oComponent.getModel("i18n").getResourceBundle().getText("messageBackendConnectionErrorOccured");

			//format response text for display in error message details
			try {
				var oResponseText = JSON.parse(oResponse.responseText);
				sMessageDetails = oResponseText.error.message.value;
			} catch (exception) {
				
				//no network connection
				if (oResponse.statusCode === 0) {
					sMessageDetails = "Your browser is currently unable to connect to City of Cape Town. Check your network connection";
				}
				
				//a server error occured
				if (oResponse.statusCode === 500) {
					sMessageDetails = "An unexpected backend error occured";
				}
				
				//default where message details could not be derived
				if (sMessageDetails === "") {
					sMessageDetails = "An unexpected connection or backend error occured";
				}
			}

			//show error dialog				
			this.oComponent.showErrorDialog(sMessage, sMessageDetails, "Backend or connection error occured");

		}

	});

});