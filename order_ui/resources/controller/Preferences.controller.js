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

			//bind table of user application parameters to this user's parameters
			this.getView().byId("tabUserApplicationParameters").bindItems({
				path: "FranchisePortal>/UserApplicationParameters",
				filters: [new sap.ui.model.Filter({
					path: "userID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: this.getOwnerComponent().oUserContext.userInfo.logonName
				})],
				factory: this.createUserApplicationParameterListItem.bind(this)
			});

			//attach listener to display of 'Preferences' target
			this.getRouter().getTarget("Preferences").attachDisplay(this.onDisplay, this);

		},

		//on view display
		onDisplay: function() {
			
			//prepare view for rendering
			this.oViewModel.setProperty("/busy", false);

			//set store from preferences
			this.getView().byId("inputRoleAttributeStoreID").setValue(this.getOwnerComponent().oUserContext.roleAttributes.StoreID.toString());

		},

		//factory function for user application parameter list item
		createUserApplicationParameterListItem: function(sId, oContext) {

			//for each user application parameter
			var oColumnListItem = new sap.m.ColumnListItem({
				path: oContext.getPath(),
				type: "Active",
				busy: false
			});

			//establish whether combobox is meant to be enabled
			var bCBoxParameterIDEnabled = this.oODataModel.getProperty("parameterValue", oContext) ? false : true;

			//provide ID of parameter
			oColumnListItem.insertCell(new sap.m.ComboBox({
				items: {
					path: "AppModel>/applicationParameters",
					template: new sap.ui.core.Item({
						key: {
							path: "AppModel>parameterID"
						},
						text: {
							path: "AppModel>parameterText"
						}
					})
				},
				selectedKey: "{FranchisePortal>parameterID}",
				enabled: bCBoxParameterIDEnabled,
				required: true
			}), 999);

			//provide value of parameter
			oColumnListItem.insertCell(new sap.m.Input({
				value: "{FranchisePortal>parameterValue}"
			}), 999);

			//return column list item instance for rendering in UI
			return oColumnListItem;

		},

		//event handler for button press to add application parameter
		onPressUserApplicationParameterAdd: function() {

			//create new entry in user application parameters entity set
			var oUserApplicationParameterContext = this.oODataModel.createEntry("UserApplicationParameters", {
				properties: {
					userID: this.getOwnerComponent().oUserContext.userInfo.logonName
				},
				groupId: "Changes"
			});

			//create new (initial) list item
			var oUserApplicationParameterListItem = this.createUserApplicationParameterListItem(null, oUserApplicationParameterContext);

			//bind new list item to new application parameter entity
			oUserApplicationParameterListItem.bindElement({
				path: oUserApplicationParameterContext.getPath(),
				model: "FranchisePortal"
			});

			//add list item to table of application parameters
			this.getView().byId("tabUserApplicationParameters").addItem(oUserApplicationParameterListItem);

		},

		//event handler for button press to save preferences
		onPressPreferencesSave: function() {

			//message handling: no unsaved changes where applicable
			if (!(this.oODataModel.hasPendingChanges() || this.oODataModel.mDeferredRequests.Changes) ) {
				this.sendStripMessage(this.getResourceBundle().getText("messageNoSaveRequiredAsNoChangesMade"), sap.ui.core.MessageType.Success);
				return;
			}

			//set view to busy
			this.getModel("viewModel").setProperty("/busy", true);

			//submit changes made to model content
			this.oODataModel.submitChanges({

				//update success handler
				success: function(oData, oResponse) {

					//message handling: updated successfully
					this.sendStripMessage(this.getResourceBundle().getText("messageChangesUpdatedSuccessfully"), sap.ui.core.MessageType.Success);

					//set view to no longer busy
					this.getModel("viewModel").setProperty("/busy", false);

				}.bind(this)

			});

		},

		//event handler for user application parameter delete
		onPressUserApplicationParameterDelete: function(oEvent) {

			//get listitem to be deleted
			var oApplicationParameterListItem = oEvent.getParameter("listItem");
			var sApplicationParameterPath = oApplicationParameterListItem.getBindingContext("FranchisePortal").getPath();
			
			//get entity instance to be deleted
			var oApplicationParameterEntity = this.oODataModel.getObject(sApplicationParameterPath);

			//delete application parmameter according to state of persistence
			if (oApplicationParameterEntity.__metadata.created) {

				//delete created entry from OData model content where transient
				this.oODataModel.deleteCreatedEntry(oApplicationParameterListItem.getBindingContext("FranchisePortal"));

			} else {

				//add delete request to batch queue where previously persisted
				this.oODataModel.remove(sApplicationParameterPath, {
					groupId: "Changes"
				});

			}

			//remove requested item from list display
			this.getView().byId("tabUserApplicationParameters").removeItem(oApplicationParameterListItem);

		}

	});

});