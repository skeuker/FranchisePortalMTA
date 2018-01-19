/* global XLSX, saveAs, Quill */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"pnp/co/za/FranchisePortalOrdering/uuid",
	"pnp/co/za/FranchisePortalOrdering/xlsx",
	"pnp/co/za/FranchisePortalOrdering/filesaver",
	"pnp/co/za/FranchisePortalOrdering/quill",
	"pnp/co/za/FranchisePortalOrdering/shim"
], function(Controller, JSONModel, uuid, xlsx, filesaver, quill, shim) {
	"use strict";
	return Controller.extend("pnp.co.za.FranchisePortalOrdering.controller.EventsList", {
		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		onInit: function() {

			//get OData model reference 
			this._oODataModel = this.getOwnerComponent().getModel("FranchisePortal");
			this.getView().setModel(this._oODataModel);
			this._oODataModel.refreshSecurityToken(false);

			//get message strip reference
			this._oMessageStrip = this.byId("msMessageStrip");
			if (this._oMessageStrip) {
				this._oMessageStrip.setVisible(false);
			}

		},
		/**
		 *@memberOf pnp.co.za.FranchisePortalOrdering.controller.EventsList
		 */
		downloadToExcel: function(oEvent) {

			//local data declaration
			var aObjects = [];

			//get event list items
			var aEventItems = this.getView().byId("listEvents").getItems();

			//compose array of event objects with attributes applicable for download
			aEventItems.forEach(function(oEventItem) {

				//get event entity from OData model
				var oObject = this._oODataModel.getObject(oEventItem.getBindingContext("FranchisePortal").getPath());

				//get array of event attribute key/value pairs
				var aObjectEntries = Object.entries(oObject);

				//reduce event entity attributes to those applicable for download
				var oReducedObject = aObjectEntries.reduce(function(oAccumulator, aObjectEntry, i) {

					//by attribute key
					switch (aObjectEntry[0]) {

						//attributes configured for download
						case 'eventID':
						case 'eventText':
						case 'validityStartDate':
						case 'validitEndDate':
						case 'thumbNailUrl':
							oAccumulator[aObjectEntry[0]] = aObjectEntry[1];
							break;

							//attributes not relevant for download
						default:
							break;
					}

					//for technical reasons related to reduce method
					return oAccumulator;

				}, {});

				//add entity with reduced attributes to object array
				aObjects.push(oReducedObject);

			}.bind(this));

			var ws = XLSX.utils.json_to_sheet(aObjects);

			var wb = XLSX.utils.book_new();

			XLSX.utils.book_append_sheet(wb, ws, "Catalog");

			/* bookType can be any supported output type */
			var wopts = {
				bookType: 'xlsx',
				bookSST: false,
				type: 'binary'
			};

			var wbout = XLSX.write(wb, wopts);

			var oFunction = function(s) {
				var buf = new ArrayBuffer(s.length);
				var view = new Uint8Array(buf);
				for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
				return buf;
			};

			/* the saveAs call downloads a file on the local machine */
			saveAs(new Blob([oFunction(wbout)], {
				type: "application/octet-stream"
			}), "test.xlsx");

		},

		//Factory function for upload collection item
		createUploadCollectionItem: function(sId, oContext) {

			//Create object path for document stream instance
			var sDocumentStreamPath = "/node/documentStream?documentID=" + this._oODataModel.getProperty("documentID",
				oContext);

			//for each entry in the 'toDocuments' document set collection
			var oUploadCollectionItem = new sap.m.UploadCollectionItem(sId, {
				documentId: oContext.getProperty("documentID"),
				fileName: this._oODataModel.getProperty("fileName", oContext),
				mimeType: this._oODataModel.getProperty("mimeType", oContext),
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
				this._oODataModel.setProperty("documentContent", sDocumentContent, oFileReader.oContext);

				//submit changes to get correct document key			
				this._oODataModel.submitChanges({

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
			var oContext = this._oODataModel.createEntry("Documents", {
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
			this._oODataModel.remove(oUploadCollectionItem.getBindingContext("FranchisePortal").sPath, {
				error: function() {}
			});

			//refresh Upload collection binding
			oEvent.getSource().getBinding("items").refresh();

		},

		//compose mail
		composeMail: function() {

			//compose text editor toolbar options
			var aToolbarOptions = [
				[{
					header: [1, 2, false]
				}],
				["bold", "italic", "underline", "strike"],
				["image", "video", "link"],
				[{
					"color": []
				}, {
					"background": []
				}],
				[{
					"align": []
				}]
			];

			//compose overall text editor options
			var oQuillOptions = {
				debug: "info",
				modules: {
					toolbar: aToolbarOptions
				},
				history: {
					delay: 2000,
					maxStack: 500,
					userOnly: true
				},
				placeholder: "Compose an epic mail...",
				theme: "snow"
			};

			//instantiate text editor with options
			this.oQuillTextEditor = new Quill("#QuillEditor", oQuillOptions);

		},

		//send mail
		sendMail: function() {

			//get mail body
			var sInnerHTML = this.oQuillTextEditor.root.innerHTML;

			//construct service url
			var sMailServiceUrl = "/FranchisePortalXS/SendMailXSJS.xsjs";

			//call XS mail send service
			jQuery.ajax({
				url: sMailServiceUrl,
				method: "GET",
				dataType: "json",

				//mail sent successfully
				success: function(oResponse) {
					this.sendStripMessage(this.getResourceBundle().getText("messageMailSendSucceeded"), sap.ui.core.MessageType.Information);
				}.bind(this),

				//failed to send mail
				error: function(oResponse) {
					this.sendStripMessage(this.getResourceBundle().getText("messageMailSendFailed"), sap.ui.core.MessageType.Error);
				}.bind(this)

			});

		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Send message using message strip
		 * @private
		 */
		sendStripMessage: function(sText, sType) {

			//message handling
			this._oMessageStrip.setText(sText);
			this._oMessageStrip.setType(sType);
			this._oMessageStrip.setVisible(true);

		}

	});

});