sap.ui.define([
	'pnp/co/za/FranchisePortalOrdering/controller/Base.controller',
	'sap/ui/model/json/JSONModel',
	'sap/ui/Device'
], function(BaseController, JSONModel, Device) {
	"use strict";
	return BaseController.extend("pnp.co.za.FranchisePortalOrdering.controller.Event", {

		//initialize controller
		onInit: function() {

			//initialize this controller
			this.initialize();

			//register controller for view display
			this.getRouter().getTarget("Event").attachDisplay(this.onDisplay, this);

			//set view model for controlling UI attributes
			this.oViewModel = new JSONModel({
				busy: false
			});
			this.setModel(this.oViewModel, "viewModel");

		},

		//on display of view
		onDisplay: function(oEvent) {

			//view is busy
			this.oViewModel.setProperty("/busy", true);
			
			//set message strip invisible
			this.oMessageStrip.setVisible(false);

			//get arguments provided for navigation into this route
			this.oNavData = oEvent.getParameter("data") || oEvent.getParameter("arguments");

			//Create object path for an existing OData model instance
			var sObjectPath = "/" + this.getModel("FranchisePortal").createKey("Events", {
				eventID: this.oNavData.eventID
			});

			//Set Binding context of the view to existing ODataModel instance 
			this.oODataModel.createBindingContext(sObjectPath, null, {
				expand: "toProducts,toShoppingCartItems"
			}, function(oEventContext) {

				//set new binding context
				this.getView().setBindingContext(oEventContext, "FranchisePortal");

				//get event entity in current state
				var oEvent = oEventContext.getObject();

				//view is no longer busy
				this.oViewModel.setProperty("/busy", false);

			}.bind(this));

		},

		//on press to add event product to shopping cart
		onPressAddEventProductToShoppingCart: function(oEvent) {

			//get list item that should be added to shopping cart
			var oListItem = oEvent.getSource().getParent();

			//get event product to be added
			var oEventProduct = oListItem.getBindingContext("FranchisePortal").getObject();

			//get quantity ordered
			var oInpQuantity = oListItem.getCells()[2];

			//create new shopping cart entry
			this.oODataModel.createEntry("EventShoppingCartItems", {
				properties: {
					eventID: oEventProduct.eventID,
					productID: oEventProduct.productID,
					productText: oEventProduct.productText,
					quantity: oInpQuantity.getValue()
				}
			});

			//view is now busy
			this.oViewModel.setProperty("/busy", true);

			//submit changes to this point
			this.oODataModel.submitChanges({

				//successfully submitted changes
				success: (function() {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//message handling
					this.oMessageStrip.setText(this.oResourceBundle.getText("messageShoppingCartItemAddedSuccessfully"));
					this.oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this.oMessageStrip.setVisible(true);

					//view is no longer busy
					this.oViewModel.setProperty("/busy", false);

				}).bind(this)

			});

		},

		//change shopping cart changes
		onEventShoppingCartSave: function() {

			//view is now busy
			this.oViewModel.setProperty("/busy", true);

			//submit changes to shopping cart
			this.oODataModel.submitChanges({

				//successfully submitted changes
				success: (function() {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//message handling
					this.oMessageStrip.setText(this.oResourceBundle.getText("messageChangesUpdatedSuccessfully"));
					this.oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this.oMessageStrip.setVisible(true);

					//view is no longer busy
					this.oViewModel.setProperty("/busy", false);

				}).bind(this)

			});

		},

		//delete shopping cart item
		onPressDeleteEventProductFromShoppingCart: function(oEvent) {

			//get list item to be removed
			var oListItemContext = oEvent.getSource().getParent().getBindingContext("FranchisePortal");

			//set view to busy
			this.oViewModel.setProperty("/busy", true);

			//delete shopping cart item from backend
			this.oODataModel.remove(oListItemContext.getPath(), {

				//service entity deleted successfully
				success: (function() {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//message handling
					this.oMessageStrip.setText(this.oResourceBundle.getText("messageDeleteModelEntitySuccessful"));
					this.oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this.oMessageStrip.setVisible(true);

					//post processing after successful updating in the backend
					this.oViewModel.setProperty("/busy", false);

				}).bind(this)

			});

		},

		//place order for items in shopping cart
		onEventPlaceOrder: function() {

			//local data declaration
			var iItemID = 0;

			//get event binding context and path
			var oEventBindingContext = this.getView().getBindingContext("FranchisePortal");
			var sEventBindingPath = oEventBindingContext.getPath();

			//get event in current status, expanding into shopping cart items navigational property
			var oEvent = this.oODataModel.getObject(sEventBindingPath, oEventBindingContext, {
				expand: 'toShoppingCartItems'
			});

			//message handling: empty shopping cart
			if (oEvent.toShoppingCartItems.length === 0) {

				//send message to message strip
				this.sendStripMessage(this.getResourceBundle().getText("messageNoOrderForEmptyShoppingCart"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//set view to busy
			this.oViewModel.setProperty("/busy", true);

			//determine a new order request ID
			var sOrderRequestID = this.getUUID();

			//prepare order request header
			var oOrderRequestHeader = {
				orderRequestID: sOrderRequestID,
				externalOrderID: "4500034251",
				eventID: oEvent.eventID,
				storeID: "WF05"
			};

			//prepare array of order request items
			var aOrderRequestItems = [];
			oEvent.toShoppingCartItems.forEach(function(oShoppingCartItem) {
				aOrderRequestItems.push({
					orderRequestID: sOrderRequestID,
					itemID: ++iItemID,
					productID: oShoppingCartItem.productID,
					quantity: oShoppingCartItem.quantity
				});
			});

			//prepare order JSON
			var oOrderRequest = {
				header: oOrderRequestHeader,
				items: aOrderRequestItems
			};
			var sOrderRequest = JSON.stringify(oOrderRequest);

			//submit order request to OData backend	
			$.ajax({
				contentType: "application/json",
				data: sOrderRequest,
				dataType: "json",
				processData: false,
				type: "POST",
				url: "/node/createOrderRequest",

				//success handler
				success: function(data) {
					
					//forced refresh of event order request headers
					this.getView().byId("tabEventOrderRequestHeaderList").getBinding("items").refresh(true);

					//forced refresh of event shopping cart items
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh(true);

					//set view to no longer busy
					this.oViewModel.setProperty("/busy", false);

					//message handling: purchase order created successfully
					this.sendStripMessage(this.getResourceBundle().getText("messagePurchaseOrderCreatedSuccessfully").replace(/&1/, data), sap.ui.core
						.MessageType.Success);

				}.bind(this),

				//error handler
				error: function(data) {

					//set view to no longer busy
					this.oViewModel.setProperty("/busy", false);

				}.bind(this)
			});

		}

	});
});