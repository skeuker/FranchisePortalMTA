/*eslint no-console: 0, no-unused-vars: 0, no-shadow: 0, new-cap: 0*/
"use strict";

//get document stream callback function

//require dependencies
var express = require("express");

//module export
module.exports = function() {

	//get access to router instance of express
	var router = express.Router();

	//register http GET handler function for document stream 
	router.get("/", function(req, res) {

		//construct sql statement
		var sStatement = 'select "documentID", "documentType" from "FranchisePortal.Document"';

		//execute statement and handle callback
		req.db.exec(sStatement, function(error, rows) {

			//error occured
			if (error) {
				res.send(error);
				return;
			}

			//resultset received
			res.send(rows);

		});
		
	});

	//feedback to caller
	return router;

};