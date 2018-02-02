/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";

//get document stream callback function

//require dependencies
var express = require("express");
var sqlstring = require("sqlstring");

//module export
module.exports = function() {

	//get access to router instance of express
	var router = express.Router();

	//register http GET handler function for document stream 
	router.get("/", function(req, res) {

		//construct sql statement 'select * from "FranchisePortal.DocumentTypes"
		//"JSON_VALUE((select SESSION_CONTEXT('XS_DOCUMENTTYPE') from DUMMY"), '$[0]')";
		//var sSql = "select SESSION_CONTEXT('XS_DOCUMENTTYPE') from DUMMY";
		var sSql = 'select * from "FranchisePortal.DocumentTypes"';

		//execute statement and handle callback
		req.db.exec(sSql, function(error, rows) {

			//error occured
			if (error) {
				res.send(error);
				return;
			}

			//Set http body and send response
			res.send(rows);

		});

	});

	//feedback to caller
	return router;

};