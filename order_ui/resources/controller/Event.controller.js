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

			//prepare view for next action
			this.prepareViewForNextAction();

			//get list item that should be added to shopping cart
			var oProductCatalogListItem = oEvent.getSource().getParent();

			//get quantity ordered
			var iQuantityOrdered = Number(oProductCatalogListItem.getCells()[3].getValue());

			//message handling: no quantity specified
			if (!iQuantityOrdered > 0) {

				//send message to message strip
				this.sendStripMessage(this.getResourceBundle().getText("messageNoProductQuantitySpecifiedForAdd"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//check for existing cart item and add
			this.checkForExistingItemAndAddToCart({
				reference: oProductCatalogListItem,
				type: "Catalog"
			}, iQuantityOrdered);

		},

		//check for existing item and add to shopping cart
		checkForExistingItemAndAddToCart: function(oListItemSource, iQuantityOrdered) {

			//local data declaration
			var oExistingShoppingCartListItem = null;
			var oExistingShoppingCartItem = null;

			//get event product to be added
			var oEventProduct = oListItemSource.reference.getBindingContext("FranchisePortal").getObject();

			//get shopping cart items that contain this product
			var aExistingShoppingCartListItems = this.getView().byId("tabEventShoppingCartItemList").getItems().filter(function(
				oShoppingCartListItem) {
				var oShoppingCartItem = oShoppingCartListItem.getBindingContext("FranchisePortal").getObject();
				var bMatch = oShoppingCartItem.productID === oEventProduct.productID ? true : false;
				return bMatch;
			});

			//present dialog whether to add quantity or replace
			if (aExistingShoppingCartListItems.length > 0) {

				//get shopping cart item for this product
				oExistingShoppingCartListItem = aExistingShoppingCartListItems[0];
				oExistingShoppingCartItem = oExistingShoppingCartListItem.getBindingContext("FranchisePortal").getObject();

				//construct confirmation dialog
				var oOptionDialog = new sap.m.Dialog({
					title: this.getResourceBundle().getText("titleAddOrReplaceShoppingCartItemQuantity"),
					type: "Message",
					content: new sap.m.Text({
						text: this.getResourceBundle().getText("messageAddOrReplaceShoppingCartItemQuantity")
					}),
					beginButton: new sap.m.Button({
						text: "Add",
						press: function() {
							iQuantityOrdered = iQuantityOrdered + oExistingShoppingCartItem.quantity;
							this.upsertEventProductInShoppingCart(iQuantityOrdered, oListItemSource, oExistingShoppingCartListItem);
							oOptionDialog.close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Replace",
						press: function() {
							this.upsertEventProductInShoppingCart(iQuantityOrdered, oListItemSource, oExistingShoppingCartListItem);
							oOptionDialog.close();
						}.bind(this)
					}),
					afterClose: function() {
						oOptionDialog.destroy();
					}

				});

				//opend dialog
				oOptionDialog.open();

				//no further processing here
				return;

			}

			//add product to shopping cart
			this.upsertEventProductInShoppingCart(iQuantityOrdered, oListItemSource, oExistingShoppingCartListItem);

		},

		//add event product to shopping cart
		upsertEventProductInShoppingCart: function(iQuantityOrdered, oListItemSource, oExistingShoppingCartListItem) {

			//prepare view for next action
			this.prepareViewForNextAction();

			//get event product to be added
			var oEventProduct = oListItemSource.reference.getBindingContext("FranchisePortal").getObject();

			//create or update existing shopping cart item
			if (!oExistingShoppingCartListItem) {

				//create new shopping cart entry where no shopping cart item exists yet
				this.oODataModel.createEntry("EventShoppingCartItems", {
					properties: {
						eventID: oEventProduct.eventID,
						productID: oEventProduct.productID,
						productText: oEventProduct.productText,
						quantity: iQuantityOrdered
					},
					groupId: "Changes"
				});

			} else {

				//update existing shopping cart item
				this.oODataModel.setProperty(oExistingShoppingCartListItem.getBindingContext("FranchisePortal").getPath() + '/quantity',
					iQuantityOrdered);

			}

			//view is now busy
			this.oViewModel.setProperty("/busy", true);

			//submit changes to this point
			this.oODataModel.submitChanges({

				//successfully submitted changes
				success: function(oData) {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//reset order quantity attribute where ordering from product catalog listing
					if (oListItemSource.type === "Catalog") {
						oListItemSource.reference.getCells()[3].setValue(null);
					}

					//message handling: successfully added/update item in shopping cart
					if (!oExistingShoppingCartListItem) {
						this.sendStripMessage(this.oResourceBundle.getText("messageShoppingCartItemAddedSuccessfully"), sap.ui.core.MessageType.Success);
					} else {
						this.sendStripMessage(this.oResourceBundle.getText("messageShoppingCartItemUpdatedSuccessfully"), sap.ui.core.MessageType.Success);
					}
					//view is no longer busy
					this.oViewModel.setProperty("/busy", false);

				}.bind(this)

			});

		},

		//change shopping cart changes
		onEventShoppingCartSave: function() {

			//no need to save where no changes made
			if (!this.oODataModel.hasPendingChanges()) {

				//send message to message strip
				this.sendStripMessage(this.getResourceBundle().getText("messageNoSaveRequiredAsNoChangesMade"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//view is now busy
			this.oViewModel.setProperty("/busy", true);

			//submit changes to shopping cart
			this.oODataModel.submitChanges({

				//successfully submitted changes
				success: function() {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//message handling
					this.oMessageStrip.setText(this.oResourceBundle.getText("messageChangesUpdatedSuccessfully"));
					this.oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this.oMessageStrip.setVisible(true);

					//view is no longer busy
					this.oViewModel.setProperty("/busy", false);

				}.bind(this)

			});

		},

		//delete shopping cart item
		onPressDeleteEventProductFromShoppingCart: function(oEvent) {

			//prepare view for next action
			this.prepareViewForNextAction();

			//get list item to be removed
			var oListItemContext = oEvent.getSource().getParent().getBindingContext("FranchisePortal");

			//set view to busy
			this.oViewModel.setProperty("/busy", true);

			//register delete request for shopping cart item removal
			this.oODataModel.remove(oListItemContext.getPath(), {
				groupId: "Changes"
			});

			//submit delete to backend
			this.oODataModel.submitChanges({

				//service entity deleted successfully
				success: function() {

					//refresh binding of shopping cart
					this.getView().byId("tabEventShoppingCartItemList").getBinding("items").refresh();

					//message handling
					this.oMessageStrip.setText(this.oResourceBundle.getText("messageDeleteModelEntitySuccessful"));
					this.oMessageStrip.setType(sap.ui.core.MessageType.Success);
					this.oMessageStrip.setVisible(true);

					//post processing after successful updating in the backend
					this.oViewModel.setProperty("/busy", false);

				}.bind(this)

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
				error: function(oResponse) {
					
					//set view to no longer busy
					this.oViewModel.setProperty("/busy", false);
					
					//show error dialog
					this.getOwnerComponent().showErrorDialog(this.getResourceBundle().getText("messageFailedToPostPurchaseOrder"), oResponse.responseText, "Order creation failed");

				}.bind(this)
			});

		},

		//on press product catalog item product link
		onPressProductCatalogItemProductLink: function(oEvent) {

			//prepare view for next action
			this.prepareViewForNextAction();

			//get product entity OData binding context
			var oProductCatalogListItem = oEvent.getSource().getParent();

			//construct dialog to display product details
			this.oProductDetailDialog = sap.ui.xmlfragment("pnp.co.za.FranchisePortalOrdering.fragment.ProductDetailDialog", this);
			this.oProductDetailDialog.attachAfterClose(function() {
				this.oProductDetailDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oProductDetailDialog);

			//bind dialog to product entity instance
			this.oProductDetailDialog.setBindingContext(oProductCatalogListItem.getBindingContext("FranchisePortal"), "FranchisePortal");
			this.oProductDetailDialog.oProductCatalogListItem = oProductCatalogListItem;

			//set applicable view model attributes
			this.oViewModel.setProperty("/buttonTextProductDetailDialogAddToCart", "Add to cart");

			//open product detail dialog
			this.oProductDetailDialog.open();

		},

		//on press shopping cart item product link
		onPressShoppingCartItemProductLink: function(oEvent) {

			//prepare view for next action
			this.prepareViewForNextAction();

			//get product entity OData binding context
			var oShoppingCartListItem = oEvent.getSource().getParent();

			//construct dialog to display product details
			this.oProductDetailDialog = sap.ui.xmlfragment("pnp.co.za.FranchisePortalOrdering.fragment.ProductDetailDialog", this);
			this.oProductDetailDialog.attachAfterClose(function() {
				this.oProductDetailDialog.destroy();
			}.bind(this));
			this.getView().addDependent(this.oProductDetailDialog);

			//create binding context for product of this shopping cart item
			var oShoppingCartItem = oShoppingCartListItem.getBindingContext("FranchisePortal").getObject();
			var sEventProductPath = "/EventProducts(eventID='" + oShoppingCartItem.eventID + "'," + "productID='" + oShoppingCartItem.productID +
				"')";
			var oEventProductBindingContext = this.oODataModel.createBindingContext(sEventProductPath);

			//bind dialog to product entity instance
			this.oProductDetailDialog.setBindingContext(oEventProductBindingContext, "FranchisePortal");
			this.oProductDetailDialog.oShoppingCartListItem = oShoppingCartListItem;

			//set applicable view model attributes
			this.oViewModel.setProperty("/buttonTextProductDetailDialogAddToCart", "Update cart");

			//set order quantity input field from existing shopping cart item
			var oInpOrderQuantity = sap.ui.getCore().byId("inpProductDetailDialogOrderQuantity");
			oInpOrderQuantity.setValue(oShoppingCartItem.quantity);

			//open product detail dialog
			this.oProductDetailDialog.open();

		},

		//on press to add event product to shopping cart from Product detail dialog
		onPressProductDetailDialogAddToCart: function(oEvent) {

			//get quantity ordered
			var iQuantityOrdered = Number(sap.ui.getCore().byId("inpProductDetailDialogOrderQuantity").getValue());

			//message handling: no quantity specified
			if (!iQuantityOrdered > 0) {

				//send message to message strip
				this.sendStripMessage(this.getResourceBundle().getText("messageNoProductQuantitySpecifiedForAdd"), sap.ui.core.MessageType.Warning);

				//no further processing
				return;

			}

			//when coming from product catalog: check for existing cart item and add
			if (this.oProductDetailDialog.oProductCatalogListItem) {
				this.checkForExistingItemAndAddToCart({
					reference: this.oProductDetailDialog.oProductCatalogListItem,
					type: "Catalog"
				}, iQuantityOrdered);
			}

			//when coming from shopping cart: update shopping cart item quantity
			if (this.oProductDetailDialog.oShoppingCartListItem) {

				//update quantity of shopping cart item
				this.upsertEventProductInShoppingCart(iQuantityOrdered, {
					reference: this.oProductDetailDialog.oShoppingCartListItem,
					type: "ShoppingCart"
				}, this.oProductDetailDialog.oShoppingCartListItem);

			}

		},

		//close product detail dialog
		onPressProductDetailDialogCloseButton: function() {

			//close product detail dialog
			this.oProductDetailDialog.close();

		},

		//increment order quantity on product detail dialog
		incrementProductDetailDialogOrderQuantity: function() {

			//get order quantity input field
			var oInpOrderQuantity = sap.ui.getCore().byId("inpProductDetailDialogOrderQuantity");

			//get current order quanity input
			var currentOrderQuantity = Number(oInpOrderQuantity.getValue());

			//set new order quanity input as current + 1
			oInpOrderQuantity.setValue(currentOrderQuantity += 1);

		},

		//decrement order quantity on product detail dialog
		decrementProductDetailDialogOrderQuantity: function() {

			//get order quantity input field
			var oInpOrderQuantity = sap.ui.getCore().byId("inpProductDetailDialogOrderQuantity");

			//get current order quanity input
			var currentOrderQuantity = Number(oInpOrderQuantity.getValue());

			//set new order quanity input as current - 1
			if (currentOrderQuantity >= 1) {
				oInpOrderQuantity.setValue(currentOrderQuantity -= 1);
			}

		}

	});
});