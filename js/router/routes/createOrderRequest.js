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

			//exception handling: sql error
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
			oStatement.exec(aItemRows, function(oError, rows) {

				//exception handling: sql error
				callback(oSqlError);

			});

		});

	}

	//delete shopping cart items
	function deleteShoppingCartItems(callback) {

		//construct sql for shopping cart item removal
		var sSqlShoppingCartDelete = sqlstring.format('delete from "FranchisePortal.EventShoppingCartItem" where "eventID" = ?',
			req.body.header.eventID);

		//execute sql statement for shopping cart delete and handle callback
		req.db.exec(sSqlShoppingCartDelete, function(oSqlError, rows) {

			//exception handling: sql error
			callback(oSqlError);

		});

	}

	//place ERP order
	function placeOrder(callback) {

		//local data declaration
		var oOrderData = {};
		var sOrderNumber = "4500000123";

		//construct basic authentication header
		var sCredentials = "c024" + ':' + "Morenic>012";
		var sb64Credentials = new Buffer(sCredentials).toString('base64');
		var sAuthenticationToken = "Basic " + sb64Credentials;

		//forward order to NetWeaver Gateway on premise
		request({
			uri: "https://gw.pnp.co.za/sap/opu/odata/blw/sam_ui5_srv/ParticipantSet?$format=json",
			method: "GET",
			json: true,
			body: JSON.stringify(oOrderData),
			headers: {
				"Authorization": sAuthenticationToken
			},
			agentOptions: {
				"rejectUnauthorized": false	//override SSL server issue UNABLE_TO_GET_ISSUER_CERT_LOCALLY
			}
		}, function(err, response, responseBody) {

			//extract order number from response body
			if (responseBody) {
				sOrderNumber = "4600000321";
			}

			//end of waterfall with order number
			callback(null, sOrderNumber);

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
				deleteShoppingCartItems,
				placeOrder
			], postProcess);

		});

		//feedback to caller
		return router;

	};