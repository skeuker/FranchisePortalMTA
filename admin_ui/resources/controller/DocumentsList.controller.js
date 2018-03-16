sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"pnp/co/za/FranchisePortalAdmin/uuid"
], function(Controller, JSONModel, uuid) {
	"use strict";
	return Controller.extend("pnp.co.za.FranchisePortalAdmin.controller.DocumentsList", {
		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		onInit: function() {

			//get OData model reference 
			this.oODataModel = this.getOwnerComponent().getModel("FranchisePortal");
			this.i18nModel = this.getOwnerComponent().getModel("i18n");
			
			//set model to smart table as direct model connection is required
			this.byId("eventsSmartTable").setModel(this.oODataModel);
			
			//attach view to this OData Model
			this.getView().setModel(this.i18nModel, "i18n");
			this.getView().setModel(this.oODataModel);

			//get message strip reference
			this.oMessageStrip = this.byId("msMessageStrip");
			if (this.oMessageStrip) {
				this.oMessageStrip.setVisible(false);
			}

		},

		//Factory function for upload collection item
		createUploadCollectionItem: function(sId, oContext) {

			//Create object path for document stream instance
			var sDocumentStreamPath = "/node/documentStream?documentID=" + this.oODataModel.getProperty("documentID",
				oContext);

			//for each entry in the 'toDocuments' document set collection
			var oUploadCollectionItem = new sap.m.UploadCollectionItem(sId, {
				documentId: oContext.getProperty("documentID"),
				fileName: this.oODataModel.getProperty("fileName", oContext),
				mimeType: this.oODataModel.getProperty("mimeType", oContext),
				url: sDocumentStreamPath
			});

			//set upload collection item attribute: document type
			var oDocumentTypeAttribute = new sap.m.ObjectAttribute({
				title: "Document type",
				text: "Excel template"
			});
			oUploadCollectionItem.insertAttribute(oDocumentTypeAttribute, 999);

			//set upload collection item attribute: file size
			var oFileSizeAttribute = new sap.m.ObjectAttribute({
				title: "File size",
				text: "60 Kb"
			});
			oUploadCollectionItem.insertAttribute(oFileSizeAttribute, 999);

			//return upload collection item instance for rendering in UI
			return oUploadCollectionItem;

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onUploadCollectionChange: function(oEvent) {

			//Get upload collection from event source
			var oUploadCollection = oEvent.getSource();

			//Get attributes of file just uploaded
			var oParameters = oEvent.getParameters();

			//Add upload collection parameter pertaining to security token
			var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
				name: "x-csrf-token",
				value: "securityTokenFromModel"
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

			//Prevent instant upload by FileUploader (line 970, debug source)
			oUploadCollection._oFileUploader.setEnabled(false);

			//create file reader and file reader event handler
			var oFileReader = new FileReader();
			oFileReader.onload = (function() {

				//get file content read
				var sDocumentContent = oFileReader.result;
				sDocumentContent = sDocumentContent.split(",")[1];

				//get new upload collection item and set status
				var oUploadCollectionItem = oUploadCollection.aItems[0];
				oUploadCollectionItem._percentUploaded = 100;
				oUploadCollectionItem._status = "display";

				//set binding context for new upload collection item
				this.oODataModel.setProperty("documentContent", sDocumentContent, oFileReader.oContext);

				//submit changes to get correct document key			
				this.oODataModel.submitChanges({

					//success event handler
					success: function(oData) {

						//raise event upload complete
						oUploadCollection.fireUploadComplete();

					}.bind(this),

					//success event handler
					error: function(oError) {

						//raise event upload complete
						oUploadCollection.fireUploadComplete();

					}.bind(this)

				});

			}).bind(this);

			//create new entry in the OData model's DocumentSet
			var oContext = this.oODataModel.createEntry("Documents", {
				properties: {
					documentID: this.getUUID(),
					documentType: "ExcelTemplate",
					fileName: oParameters.files[0].name,
					fileType: oParameters.files[0].type,
					mimeType: oParameters.files[0].type
				}
			});

			//provide file reader with binding context
			oFileReader.oContext = oContext;

			//invoke reading of content of file just uploaded
			oFileReader.readAsDataURL(oParameters.files[0]);

		},

		/**
		 * Gets a UUID as a unique ID at runtime formatted
		 * in such way that it is acceptable as SAP GUID
		 * @public
		 */
		getUUID: function() {

			/*return version1 UUID, removing formatting hyphens, 
			converting to upper case to match a SAP GUID*/
			return window.uuid.v1().replace(/-/g, "").toUpperCase();

		},

		/**
		 *@memberOf capetown.gov.registration.controller.Person
		 */
		onDocumentTypesChange: function(oEvent) {

			//get reference to document upload UI controls
			var oCBoxDocumentTypes = oEvent.getSource();
			var oUploadCollection = this.getView().byId("ucDocUploadCollection");

			//disable upload collection upload when no document type selected
			if (oCBoxDocumentTypes.getSelectedItem() === null) {
				oUploadCollection.setUploadEnabled(false);
				return;
			}

			//enable upload collection upload when document type selected
			oUploadCollection.setUploadEnabled(true);

		},

		//event handler for deletion of upload collection item
		onFileDeleted: function(oEvent) {

			//get upload collection item affected by deletion
			var oUploadCollectionItem = oEvent.getParameter("item");

			//remove persistent instance from server (this canNOT be done staged for submitChanges)
			this.oODataModel.remove(oUploadCollectionItem.getBindingContext("FranchisePortal").sPath, {
				error: function() {}
			});

			//refresh Upload collection binding
			oEvent.getSource().getBinding("items").refresh();

		}

	});

});