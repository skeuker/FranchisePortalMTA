/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";

//require dependencies
var express = require("express");
var sqlstring = require("sqlstring");
var xssec = require("@sap/xssec");

//module export
module.exports = function() {

	//get access to router instance of express
	var router = express.Router();

	//register http GET handler function for document stream 
	router.get("/", function(req, res) {

		//local data declaration
		var oRoleAttributes = {};
		oRoleAttributes.StoreID = [];

		//get StoreID user attribute from roles
		var aRoleAttributeStores = req.authInfo.getAttribute("StoreID");
		aRoleAttributeStores.forEach(function(oRoleAttributeStore) {

			//split StoreID attribute value as it might contain several stores
			var aRoleAttributeStoreSplit = oRoleAttributeStore.split(",");

			//for each store in the StoreID authorization attribute value
			aRoleAttributeStoreSplit.forEach(function(oRoleAttributeStoreSplit) {
				
				//remove whitespace from array of store IDs from authorization attribute
				var sStoreID = oRoleAttributeStoreSplit.trim();
				
				//keep track of unique stores in Store ID role attribute array
				if (!oRoleAttributes.StoreID.find(function(sArrayStoreID) {
						return sArrayStoreID === sStoreID;
					})) {
					oRoleAttributes.StoreID.push(sStoreID);
				}
				
			});

		});

		//construct sql statement to get user's application parameter values
		var sSql = sqlstring.format(
			'select "parameterID", "parameterValue" from "FranchisePortal.UserApplicationParameter" where "userID" = ?',
			req.authInfo.userInfo.logonName);

		//execute statement and handle callback
		req.db.exec(sSql, function(error, rows) {

			//error occured
			if (error) {
				res.send(error);
				return;
			}

			//create user context object
			var oUserContext = {
				userInfo: req.authInfo.userInfo,
				roleAttributes: oRoleAttributes,
				userParameters: rows
			};

			//Set response ok code
			res.status(200);

			//Set http body and send response
			res.send(JSON.stringify(oUserContext));

		});

	});

	//feedback to caller
	return router;

};