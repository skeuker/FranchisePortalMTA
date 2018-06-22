sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"pnp/co/za/FranchisePortalOrdering/util/ErrorHandler",
	"pnp/co/za/FranchisePortalOrdering/model/models"
], function(UIComponent, Device, ErrorHandler, models) {
	"use strict";

	return UIComponent.extend("pnp.co.za.FranchisePortalOrdering.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			
			//instantiate an error handler
			this.oErrorHandler = new ErrorHandler(this);

			//preload error fragment to prevent issues later due to connection issues
			sap.ui.xmlfragment("pnp.co.za.FranchisePortalOrdering.fragment.Error").destroy();

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// create the views based on the url/hash
			this.getRouter().initialize();

		},

		getContentDensityClass: function() {
			if (!this._sContentDensityClass) {
				if (!sap.ui.Device.support.touch) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		
		//show error dialog
		showErrorDialog: function(sMessage, sMessageDetails, sTitle) {

			//only one error dialog at a time
			if (this.bErrorDialogOpen) {
				return;
			}

			//create Error model for rendering in dialog
			var oError = new sap.ui.model.json.JSONModel({
				message: sMessage,
				messageDetails: sMessageDetails
			});

			//construct confirmation dialog content
			var oErrorDialogContent = sap.ui.xmlfragment("pnp.co.za.FranchisePortalOrdering.fragment.Error", this);

			//construct dialog instance			
			this.oErrorDialog = new sap.m.Dialog({
				icon: "sap-icon://message-error",
				type: sap.m.DialogType.Message,
				state: sap.ui.core.ValueState.Error,
				title: sTitle,
				contentWidth: "450px",
				draggable: true,
				content: oErrorDialogContent,

				//buttons
				buttons: [

					//e-mail this error text
					new sap.m.Button({
						type: sap.m.ButtonType.Transparent,
						text: "e-Mail",
						press: function() {

							//trigger email send
							sap.m.URLHelper.triggerEmail("skeuker@pnp.co.za", "Franchise Portal script error", sMessageDetails);

							//close script error dialog dialog
							this.oErrorDialog.close();

						}.bind(this)

					}),

					//exit from user action
					new sap.m.Button({
						id: "buttonErrorDialogExit",
						type: "Emphasized",
						text: "Exit",
						visible: false,
						press: function() {

							//close error dialog
							this.oErrorDialog.close();

							//navigate back to previous or home
							this.navigateBack("Home");

						}.bind(this)

					}),

					//close this error dialog
					new sap.m.Button({
						id: "buttonErrorDialogClose",
						type: "Emphasized",
						text: "Close",
						press: function() {

							//close error dialog
							this.oErrorDialog.close();

						}.bind(this)

					})

				],

				//event handler for dialog destroy
				afterClose: function() {

					//destroy error dialog UI control
					this.oErrorDialog.destroy();

					//error dialog no longer open
					this.bErrorDialogOpen = false;

				}.bind(this)

			});

			//set error model to dialog
			this.oErrorDialog.setModel(oError, "Error");

			//keep track that error dialog open
			this.bErrorDialogOpen = true;

			//open dialog
			this.oErrorDialog.open();

		},

		//set error message text details to visible
		toggleErrorDetails: function() {

			//get current visibility of error details
			var bVisible = sap.ui.getCore().byId("felemErrorMessageDetails").getVisible();

			//set error message details text area to visible
			switch (bVisible) {
				case true:
					sap.ui.getCore().byId("felemErrorMessageDetails").setVisible(false);
					break;
				case false:
					sap.ui.getCore().byId("felemErrorMessageDetails").setVisible(true);
					break;
			}

		},
		
		/**
		 * Navigate back in history or to specified route
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		navigateBack: function(sRoute) {

			//get previous hash
			var sPreviousHash = History.getInstance().getPreviousHash();

			//navigate to previous hash where available
			if (sPreviousHash !== undefined) {

				//Use browser history to go navigate back
				history.go(-1);

			} else {

				// Otherwise navigate along route and write history
				this.getRouter().navTo(sRoute, {}, true);

			}

		}

	});
});