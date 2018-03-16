	/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
	"use strict";

	//'global' data declaration
	var req;
	var res;

	//require dependencies
	var express = require("express");
	var sqlstring = require("sqlstring");
	var request = require('request');
	var async = require("async");

	//insert order request header
	function insertOrderRequestHeader(callback) {

		//construct sql for order request header insert
		var sSqlHeaderInsert = sqlstring.format('insert into "FranchisePortal.OrderRequestHeader" values(?,?,?,?)', [req.body.header.orderRequestID,
			req.body.header.eventID, req.body.header.storeID, req.body.header.externalOrderID
		]);

		//execute sql statement for order request header insert and handle callback
		req.db.exec(sSqlHeaderInsert, function(oSqlError, rows) {

			//continue waterfall
			callback(oSqlError);

		});

	}

	//insert order request items
	function insertOrderRequestItems(callback) {

		//prepare statement for order request item insert
		req.db.prepare('insert into "FranchisePortal.OrderRequestItem" values (?,?,?,?)', function(oSqlError, oStatement) {

			//exception handling: sql error
			if (oSqlError) {
				callback(oSqlError);
			}

			//prepare order request item attribute value arrays
			var aItemRow = [];
			var aItemRows = [];
			req.body.items.forEach(function(oItem) {
				aItemRow = [];
				aItemRow.push(oItem.orderRequestID);
				aItemRow.push(oItem.itemID);
				aItemRow.push(oItem.productID);
				aItemRow.push(oItem.quantity);
				aItemRows.push(aItemRow);
			});

			//insert items
			oStatement.exec(aItemRows, function(oSqlError, rows) {

				//continue waterfall
				callback(oSqlError);

			});

		});

	}

	//place ERP order
	function placeOrder(callback) {

		//local data declaration
		var sOrderNumber = "4500000123";

		//construct basic authentication header
		var sCredentials = "c024" + ':' + "Morenic>012";
		var sb64Credentials = new Buffer(sCredentials).toString('base64');
		var sAuthenticationToken = "Basic " + sb64Credentials;

		//get CSRF token by performing GET request
		request({
				uri: "https://gw.pnp.co.za:443/sap/opu/odata/pnp/rt_purchase_order_srv/$metadata",
				method: "GET",
				headers: {
					"Authorization": sAuthenticationToken,
					"x-csrf-token": "Fetch"
				},
				jar: true, //put cookies in the jar, required to ensure cokies are include in POST call
				agentOptions: {
					"rejectUnauthorized": false //override SSL server issue UNABLE_TO_GET_ISSUER_CERT_LOCALLY
				}
			},

			//CSRF token request callback 
			function(err, response, responseBody) {

				//request exception handling
				if (err) {
					callback(err);
				}

				//get order request information
				var oOrderRequest = req.body;

				//create stub of PO create input
				var oPOCreateInput = {
					CompanyCode: "1000",
					PurchaseDocType: "NB",
					VendorID: "MA05",
					PurchaseOrganisationID: "1010",
					PurchaseGroup: "101",
					toPurchaseOrderItems: []
				};

				//add purchase order items to PO create input
				var PurchaseOrderItemID = 1;
				oOrderRequest.items.forEach(function(oOrderRequestItem) {
					oPOCreateInput.toPurchaseOrderItems.push({
						PurchaseOrderItemID: oOrderRequestItem.itemID.toString(),
						MaterialID: oOrderRequestItem.productID,
						PlantID: "WC21",
						Quantity: oOrderRequestItem.quantity,
						UnitOfMeasure: "EA",
						NetValue: "14.50"
					});
					PurchaseOrderItemID++;
				});

				//create purchase order in gateway backend
				request({
						uri: "https://gw.pnp.co.za/sap/opu/odata/pnp/rt_purchase_order_srv/PurchaseOrderHeaderSet",
						method: "POST",
						body: JSON.stringify(oPOCreateInput),
						headers: {
							"Authorization": sAuthenticationToken,
							"x-csrf-token": response.headers["x-csrf-token"],
							"Content-Type": "application/json",
							"Accept": "application/json"
						},
						jar: true, //send cookies contained in the jar
						agentOptions: {
							"rejectUnauthorized": false //override SSL server issue UNABLE_TO_GET_ISSUER_CERT_LOCALLY
						}
					},

					//create purchase order callback
					function(err, response, responseBody) {

						//request exception handling
						if (err) {
							callback(err);
						}

						//get purchase order number
						var oPOCreateOutput = JSON.parse(responseBody);

						//extract order number from response body
						sOrderNumber = oPOCreateOutput.d.PurchaseOrderID;

						//continue waterfall
						callback(null, sOrderNumber);

					});

			});

	}

	//update order request header
	function updateOrderRequestHeader(sOrderNumber, callback) {

		//construct sql to update SAP purchase order number as external reference into order request header
		var sSqlOrderRequestHeaderUpdate = sqlstring.format(
			'update "FranchisePortal.OrderRequestHeader" set "externalOrderID" = ? where "orderRequestID" = ?', [sOrderNumber, req.body.header.orderRequestID]
		);

		//execute sql statement to update order number into order request header and handle callback
		req.db.exec(sSqlOrderRequestHeaderUpdate, function(oSqlError, rows) {

			//continue waterfall promoting order number on
			callback(oSqlError, sOrderNumber);

		});

	}

	//delete shopping cart items
	function deleteShoppingCartItems(sOrderNumber, callback) {

		//construct sql for shopping cart item removal
		var sSqlShoppingCartDelete = sqlstring.format('delete from "FranchisePortal.EventShoppingCartItem" where "eventID" = ?',
			req.body.header.eventID);

		//execute sql statement for shopping cart delete and handle callback
		req.db.exec(sSqlShoppingCartDelete, function(oSqlError, rows) {

			//continue waterfall promoting order number
			callback(oSqlError, sOrderNumber);

		});

	}

	//post process order placement
	function postProcess(oError, sOrderNumber) {

		//message handling: an error occured
		if (oError) {

			//rollback
			req.db.rollback();

			//close off request
			res.status(500);
			res.send(oError);

			//no further processing
			return;

		}

		//commit work
		req.db.commit();

		//Set response ok code
		res.status(200);

		//Send response
		res.send(sOrderNumber);

	}

	//module export
	module.exports = function() {

		//get access to router instance of express
		var router = express.Router();

		//register http POST handler function for document stream 
		router.post("/", function(expressRequest, expressResponse) {

			//adopt input for processing
			req = expressRequest;
			res = expressResponse;

			//no auto commit to allow for LUW
			req.db.setAutoCommit(false);

			//run processing as task waterfall
			async.waterfall([
				insertOrderRequestHeader,
				insertOrderRequestItems,
				placeOrder,
				updateOrderRequestHeader,
				deleteShoppingCartItems
			], postProcess);

		});

		//feedback to caller
		return router;

	};