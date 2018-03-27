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
		
		//get StoreID user attribute from roles
		oRoleAttributes.StoreID = req.authInfo.getAttribute("StoreID");
		
		//create user context object
		var oUserContext = { userInfo: req.authInfo.userInfo, roleAttributes: oRoleAttributes };
		
		//Set response ok code
		res.status(200);

		//Set http body and send response
		res.send(JSON.stringify(oUserContext));

	});

	//feedback to caller
	return router;

};