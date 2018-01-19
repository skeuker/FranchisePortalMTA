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

		//get document ID for which to provide document stream
		var sDocumentID = req.query.documentID;

		//construct sql statement
		var sSql = sqlstring.format(
			'select a."documentID", a."fileName", a."documentType", a."mimeType", b."documentContent" ' +
			'from "FranchisePortal.Document" as a inner join "FranchisePortal.DocumentStream" as b ' +
			'on a."documentID" = b."documentID" where a."documentID" = ?',
			sDocumentID);

		//execute statement and handle callback
		req.db.exec(sSql, function(error, rows) {

			//error occured
			if (error) {
				res.send(error);
				return;
			}

			//access document
			var oDocument;
			rows.forEach(function(row) {
				oDocument = row;
			});

			//set response mime type
			res.type(oDocument.mimeType);

			//set http header content disposition
			res.set("Content-Disposition", "inline; filename = " + oDocument.fileName);

			//Set response ok code
			res.status(200);

			//Set http body and send response
			res.send(Buffer.from(oDocument.documentContent.toString(), "base64"));

		});

	});

	//feedback to caller
	return router;

};