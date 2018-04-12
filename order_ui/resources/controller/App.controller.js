sap.ui.define([
	'pnp/co/za/FranchisePortalOrdering/controller/Base.controller'
], function(BaseController) {
	"use strict";

	return BaseController.extend("pnp.co.za.FranchisePortalOrdering.controller.App", {

		//init hook of UI5 controller framework
		onInit: function() {

			//initialize this controller
			this.initialize();

			//add style class
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			//set one change group summarizing all changes
			this.oODataModel.setChangeGroups({
				"UserApplicationParametersType": {
					groupId: "Changes"
				},
				"EventShoppingCartItemsType": {
					groupId: "Changes"
				}
			});

			//set change group for all changes to deferred 
			this.oODataModel.setDeferredGroups(["Changes"]);

			//get user context	
			$.ajax({

				//attributes of backend call
				contentType: "application/json",
				dataType: "json",
				processData: false,
				type: "GET",
				url: "/node/getUserContext",

				//success handler
				success: function(oUserContext) {

					//keep track of user context for use in application
					this.getOwnerComponent().oUserContext = oUserContext;

					//compose name of logged on user
					var sLoggedOnUser = oUserContext.userInfo.givenName + " " + this.getOwnerComponent().oUserContext.userInfo.familyName;

					//set view model attributes
					this.oViewModel.setProperty("/loggedOnUser", sLoggedOnUser);

				}.bind(this)

			});

		},

		/**
		 * Event handler for select on navigation item
		 * @public
		 * @param {sap.ui.base.Event} oEvent The item select event
		 */
		onNavigationItemSelect: function(oEvent) {

			//get selected navigation item 
			var oNavigationItem = oEvent.getParameter('item');

			//confirm navigation without save
			if (this.oODataModel && (this.oODataModel.hasPendingChanges() || this.oODataModel.mDeferredRequests.Changes)) {

				//Confirmation dialog to leave without saving
				sap.m.MessageBox.confirm(this.getResourceBundle().getText("messageNavigateWithoutSaving"), {
					styleClass: this.getOwnerComponent().getContentDensityClass(),

					//actions to be displayed
					actions: [
						sap.m.MessageBox.Action.OK,
						sap.m.MessageBox.Action.CANCEL
					],

					//on close of confirmation dialog
					onClose: function(oAction) {

						//user chose to cancel 					
						if (oAction === sap.m.MessageBox.Action.CANCEL) {
							return;
						}

						//user chose to leave without saving
						if (oAction === sap.m.MessageBox.Action.OK) {

							//reset changes related to 'createEntity' and two-way bound properties
							this.oODataModel.resetChanges();

							//reset deferred DELETE requests for group 'Changes'
							if (this.oODataModel.mDeferredRequests.Changes) {
								delete this.oODataModel.mDeferredRequests.Changes;
							}

							//do navigate to seleted item
							this.doNavigateToSelectedItem(oNavigationItem);

							//no further processing here
							return;

						}

					}.bind(this)

				});

				//no further processing here
				return;

			}

			//do navigate to seleted item
			this.doNavigateToSelectedItem(oNavigationItem);

		},

		/**
		 * Event handler for select on navigation item
		 * @public
		 * @param {sap.ui.base.Event} oEvent The item select event
		 */
		doNavigateToSelectedItem: function(oNavigationItem) {

			//get selected navigation item and key thereof
			var sKey = oNavigationItem.getKey();

			//depending on selected navigation item key
			switch (sKey) {

				//navigate to route of same name
				case "Home":
				case "Preferences":
				case "EventsList":
					this.getRouter().navTo(sKey);
					break;

					//no navigation for parent navigation item
				case "EventListing":
					break;

					//unhandled navigation items
				default:
					sap.m.MessageToast.show("Navigation for item key " + sKey + " has not yet been implemented");
			}

		},

		onUserNamePress: function(oEvent) {
			var oBundle = this.getModel("i18n").getResourceBundle();
			// close message popover
			var oMessagePopover = this.getView().byId("errorMessagePopover");
			if (oMessagePopover && oMessagePopover.isOpen()) {
				oMessagePopover.destroy();
			}
			var fnHandleUserMenuItemPress = function(oEvent) {
				sap.m.MessageToast.show(oEvent.getSource().getText() + " was pressed");
			};
			var oActionSheet = new sap.m.ActionSheet(this.getView().createId("userMessageActionSheet"), {
				title: oBundle.getText("userHeaderTitle"),
				showCancelButton: false,
				buttons: [
					new sap.m.Button({
						text: 'User Settings',
						type: sap.m.ButtonType.Transparent,
						press: fnHandleUserMenuItemPress
					}),
					new sap.m.Button({
						text: "Online Guide",
						type: sap.m.ButtonType.Transparent,
						press: fnHandleUserMenuItemPress
					}),
					new sap.m.Button({
						text: 'Feedback',
						type: sap.m.ButtonType.Transparent,
						press: fnHandleUserMenuItemPress
					}),
					new sap.m.Button({
						text: 'Help',
						type: sap.m.ButtonType.Transparent,
						press: fnHandleUserMenuItemPress
					}),
					new sap.m.Button({
						text: 'Logout',
						type: sap.m.ButtonType.Transparent,
						press: fnHandleUserMenuItemPress
					})
				],
				afterClose: function() {
					oActionSheet.destroy();
				}
			});

			// forward compact/cozy style into dialog
			jQuery.sap.syncStyleClass(this.getView().getController().getOwnerComponent().getContentDensityClass(), this.getView(), oActionSheet);
			oActionSheet.openBy(oEvent.getSource());
		},

		onSideNavButtonPress: function() {
			var oToolPage = this.getView().byId("app");
			var bSideExpanded = oToolPage.getSideExpanded();
			this._setToggleButtonTooltip(bSideExpanded);
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
		},

		_setToggleButtonTooltip: function(bSideExpanded) {
			var oToggleButton = this.getView().byId('sideNavigationToggleButton');
			if (bSideExpanded) {
				oToggleButton.setTooltip('Large Size Navigation');
			} else {
				oToggleButton.setTooltip('Small Size Navigation');
			}
		},

		// Errors Pressed
		onMessagePopoverPress: function(oEvent) {

			//construct message popover containing all alerts
			var oMessagePopover = new sap.m.MessagePopover({
				placement: sap.m.VerticalPlacementType.Bottom,
				items: {
					path: 'AlertModel>/errors',
					factory: this.createErrorMessagePopoverItem.bind(this)
				},
				afterClose: function() {
					oMessagePopover.destroy();
				}
			});

			//forward compact/cozy style into dialog
			jQuery.sap.syncStyleClass(this.getView().getController().getOwnerComponent().getContentDensityClass(), this.getView(),
				oMessagePopover);

			//open message popover
			this.getView().addDependent(oMessagePopover);
			oMessagePopover.openBy(oEvent.getSource());

		},

		/**
		 * Event handler for the notification button
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onNotificationPress: function(oEvent) {
			var oBundle = this.getModel("i18n").getResourceBundle();
			// close message popover
			var oMessagePopover = this.getView().byId("errorMessagePopover");
			if (oMessagePopover && oMessagePopover.isOpen()) {
				oMessagePopover.destroy();
			}
			var oButton = new sap.m.Button({
				text: oBundle.getText("notificationButtonText"),
				press: function() {
					sap.m.MessageToast.show("Show all Notifications was pressed");
				}
			});
			var oNotificationPopover = new sap.m.ResponsivePopover(this.getView().createId("notificationMessagePopover"), {
				title: oBundle.getText("notificationTitle"),
				contentWidth: "300px",
				endButton: oButton,
				placement: sap.m.PlacementType.Bottom,
				content: {
					path: 'alerts>/alerts/notifications',
					factory: this._createNotification
				},
				afterClose: function() {
					oNotificationPopover.destroy();
				}
			});
			this.getView().byId("app").addDependent(oNotificationPopover);
			// forward compact/cozy style into dialog
			jQuery.sap.syncStyleClass(this.getView().getController().getOwnerComponent().getContentDensityClass(), this.getView(),
				oNotificationPopover);
			oNotificationPopover.openBy(oEvent.getSource());
		},

		/**
		 * Factory function for the notification items
		 * @param {string} sId The id for the item
		 * @param {sap.ui.model.Context} oBindingContext The binding context for the item
		 * @returns {sap.m.NotificationListItem} The new notification list item
		 * @private
		 */
		_createNotification: function(sId, oBindingContext) {
			var oBindingObject = oBindingContext.getObject();
			var oNotificationItem = new sap.m.NotificationListItem({
				title: oBindingObject.title,
				description: oBindingObject.description,
				priority: oBindingObject.priority,
				close: function(oEvent) {
					var sBindingPath = oEvent.getSource().getCustomData()[0].getValue();
					var sIndex = sBindingPath.split("/").pop();
					var aItems = oEvent.getSource().getModel("alerts").getProperty("/alerts/notifications");
					aItems.splice(sIndex, 1);
					oEvent.getSource().getModel("alerts").setProperty("/alerts/notifications", aItems);
					oEvent.getSource().getModel("alerts").updateBindings("/alerts/notifications");
					sap.m.MessageToast.show("Notification has been deleted.");
				},
				datetime: oBindingObject.date,
				authorPicture: oBindingObject.icon,
				press: function() {},
				customData: [
					new sap.m.CustomData({
						key: "path",
						value: oBindingContext.getPath()
					})
				]
			});
			return oNotificationItem;
		},

		//create message popover item for display
		createErrorMessagePopoverItem: function(sId, oBindingContext) {

			//get access to alert instance
			var oAlert = oBindingContext.getObject();

			//construct link to load metadata where applicable
			if (oAlert.subtitle === "Metadata load failed") {
				var oLoadMetadataLink = new sap.m.Link({
					press: this.retryMetadataLoad.bind(this),
					text: "Reload"
				});
			}

			//construct message item
			var oMessageItem = new sap.m.MessagePopoverItem({
				title: oAlert.title,
				subtitle: oAlert.subTitle,
				description: oAlert.description,
				counter: oAlert.counter,
				link: oLoadMetadataLink
			});

			//feedback to caller
			return oMessageItem;

		},

		//retry to load metadata
		retryMetadataLoad: function(oEvent) {

			//refresh OData model bindings
			var oMetadataLoadPromise = this.getOwnerComponent().getModel("FranchisePortal").refreshMetadata();

			//await metadata loading
			oMetadataLoadPromise.then(function() {

				//create notification
				//todo

			}, function() {
				
				//no further processing
				
			});

		}

	});
});