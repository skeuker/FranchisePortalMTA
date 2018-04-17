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

					//notify about need to set store preference where applicable
					if (this.getUserStoreID() === null) {
						this.notifyAboutRequiredPreferences("StoreID");
					}

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

		//on user name press event handler
		onUserNamePress: function(oEvent) {

			var oBundle = this.getModel("i18n").getResourceBundle();

			// close message popover where applicable
			if (this.oMessagePopover && this.oMessagePopover.isOpen()) {
				this.oMessagePopover.close();
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

		//toggle side navigation between expanded and condensed
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

			//no further processing where message popover is open
			if (this.oMessagePopover && this.oMessagePopover.isOpen()) {
				return;
			}

			//construct message popover containing all alerts
			this.oMessagePopover = new sap.m.MessagePopover({
				placement: sap.m.VerticalPlacementType.Bottom,
				items: {
					path: 'AlertModel>/errors',
					factory: this.createErrorMessagePopoverItem.bind(this)
				},
				afterClose: function() {
					if (this.oMessagePopover) {
						this.oMessagePopover.destroy();
					}
				}
			});

			//forward compact/cozy style into dialog
			jQuery.sap.syncStyleClass(this.getView().getController().getOwnerComponent().getContentDensityClass(), this.getView(),
				this.oMessagePopover);

			//open message popover
			this.getView().addDependent(this.oMessagePopover);
			this.oMessagePopover.openBy(oEvent.getSource());

		},

		/**
		 * Event handler for the notification button
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onNotificationPress: function(oEvent) {

			//no further processing where noticiation popover is open
			if (this.oNotificationPopover && this.oNotificationPopover.isOpen()) {
				return;
			}

			// close message popover where applicable
			if (this.oMessagePopover && this.oMessagePopover.isOpen()) {
				this.oMessagePopover.close();
			}

			//construct button to close notification popover
			var oNotificationPopoverCloseButton = new sap.m.Button({
				text: this.oResourceBundle.getText("textCloseNotificationPopover"),
				press: function() {
					this.oNotificationPopover.close();
				}.bind(this)
			});

			//construct popover containing all notifications
			this.oNotificationPopover = new sap.m.ResponsivePopover(this.getView().createId("notificationMessagePopover"), {
				title: this.oResourceBundle.getText("titleNotificationPopover"),
				contentWidth: "300px",
				endButton: oNotificationPopoverCloseButton,
				placement: sap.m.PlacementType.Bottom,
				content: {
					path: "AlertModel>/notifications",
					factory: this.createNotificationPopoverItem.bind(this)
				},
				afterClose: function() {
					this.oNotificationPopover.destroy();
				}.bind(this)
			});

			//prepare view for dialog open
			this.getView().byId("app").addDependent(this.oNotificationPopover);
			this.oNotificationPopover.openBy(oEvent.getSource());

		},

		/**
		 * Factory function for the notification items
		 * @param {string} sId The id for the item
		 * @param {sap.ui.model.Context} oBindingContext The binding context for the item
		 * @returns {sap.m.NotificationListItem} The new notification list item
		 * @private
		 */
		createNotificationPopoverItem: function(sId, oBindingContext) {

			//get notification of this binding context
			var oNotification = oBindingContext.getObject();

			//create notification list item
			var oNotificationItem = new sap.m.NotificationListItem({

				//notifcation attributes
				title: oNotification.title,
				description: oNotification.description,
				priority: oNotification.priority,

				//on closing this notification
				close: function(oEvent) {

					//get listitem and notification to be deleted
					var oNotificationToDelete = oEvent.getSource().getBindingContext("AlertModel").getObject();
					var aNotificationsAsIs = oEvent.getSource().getModel("AlertModel").getProperty("/notifications");

					//construct new list of notifications
					var aNotificationsToBe = aNotificationsAsIs.filter(function(oNotificationEntry) {
						return oNotificationEntry.title !== oNotificationToDelete.title;
					});

					//set new list of notifications and remove notification list item
					oEvent.getSource().getModel("AlertModel").setProperty("/notifications", aNotificationsToBe);
					oEvent.getSource().getModel("AlertModel").updateBindings(true);

					//close notification popover where applicable
					if (aNotificationsToBe.length === 0 && this.oNotificationPopover) {
						this.oNotificationPopover.close();
					}

				}.bind(this),
				datetime: oNotification.date,
				authorPicture: oNotification.icon,

				//notification item press even
				press: this.onPressNotificationListItem.bind(this)

			});

			//feedback to caller
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

			//set view to busy
			this.oViewModel.setProperty("/busy", true);

			//refresh OData model bindings
			var oMetadataLoadPromise = this.getOwnerComponent().getModel("FranchisePortal").refreshMetadata();

			//await metadata loading
			oMetadataLoadPromise.then(function() {

				//get data of alert model
				var oAlerts = JSON.parse(this.getOwnerComponent().getModel("AlertModel").getJSON());

				//remove metadata load error from alerts
				var aAlerts = oAlerts.errors.filter(function(oAlert) {
					if (oAlert.subtitle === "Metadata load failed") {
						return false;
					}
					return true;
				});
				oAlerts.errors = aAlerts;

				//set error alerts to JSON model instance
				this.getOwnerComponent().getModel("AlertModel").setData(oAlerts);

				//close message popover
				this.oMessagePopover.close();

				//set view to no longer busy
				this.oViewModel.setProperty("/busy", false);

			}.bind(this), function() {

				//close message popover
				this.oMessagePopover.close();

				//set view to no longer busy
				this.oViewModel.setProperty("/busy", false);

				//no further processing: attached metadata load failure event handler is invoked

			}.bind(this));

		},

		//notify about required preferences
		notifyAboutRequiredPreferences: function(sApplicationParameterID) {

			//get reference to the alert model
			var oAlertModel = this.getOwnerComponent().getModel("AlertModel");
			if (!oAlertModel) {
				oAlertModel = new sap.m.JSONModel({
					notifications: [],
					errors: []
				});
				this.getOwnerComponent().setModel(oAlertModel, "AlertModel");
			}

			//get current alert model content
			var aNotifications = oAlertModel.getProperty("/notifications");

			//push new notification into alert model
			switch (sApplicationParameterID) {
				case "StoreID":
					aNotifications.push({
						"priority": "High",
						"title": "Set store preference",
						"description": this.oResourceBundle.getText("messageSetStoreIDApplicationParameter"),
						"hideShowMoreButton": false,
						"icon": "sap-icon://user-settings"
					});
					break;
			}

			//set new alert model content to alert model
			oAlertModel.setProperty("/notifications", aNotifications);
			oAlertModel.updateBindings(true);

		},

		//notification list item press event handler
		onPressNotificationListItem: function(oEvent) {

			//get notification that was pressed
			var oNotification = oEvent.getSource().getBindingContext("AlertModel").getObject();

			//invoke appropriate action
			switch (oNotification.title) {

				//set store preference
				case "Set store preference":
					this.oNotificationPopover.close();
					this.getRouter().navTo("Preferences");
					break;

			}

		},

		//notify about missing authorization
		notifyAboutMissingAuthorization: function(sAuthorizationAttributeID) {

			//get reference to the alert model
			var oAlertModel = this.getOwnerComponent().getModel("AlertModel");
			if (!oAlertModel) {
				oAlertModel = new sap.m.JSONModel({
					notifications: [],
					errors: []
				});
				this.getOwnerComponent().setModel(oAlertModel, "AlertModel");
			}

			//get current alert model content
			var aNotifications = oAlertModel.getProperty("/notifications");

			//push new notification into alert model
			switch (sAuthorizationAttributeID) {
				case "StoreID":
					aNotifications.push({
						"priority": "High",
						"title": "Missing store authorization",
						"description": this.oResourceBundle.getText("messageMissingStoreIDAuthorizationAttribute"),
						"hideShowMoreButton": false,
						"icon": "sap-icon://badge"
					});
					break;
			}

			//set new alert model content to alert model
			oAlertModel.setProperty("/notifications", aNotifications);
			oAlertModel.updateBindings(true);

		},

		//get user's store ID 
		getUserStoreID: function() {

			//get reference to user context	
			var oUserContext = this.getOwnerComponent().oUserContext;

			//no store ID in user authorization
			if (!oUserContext.roleAttributes.StoreID || oUserContext.roleAttributes.StoreID.length === 0) {
				this.notifyAboutMissingAuthorization("StoreID");
				return;
			}

			//get store preference as the one that the user is authorized for
			if (oUserContext.roleAttributes.StoreID.length === 1) {
				return oUserContext.roleAttributes.StoreID[0];
			}

			//user is authorized for more than one store: get store user application parameter
			var aPreferredStoreID = oUserContext.userParameters.filter(function(oUserParameter) {
				return oUserParameter.parameterID === "StoreID";
			});

			//return store that has previously been set as preferred
			if (aPreferredStoreID.length > 0) {
				return aPreferredStoreID[0];
			}
			
			//no preferred store can be identified
			return null;

		}

	});
});