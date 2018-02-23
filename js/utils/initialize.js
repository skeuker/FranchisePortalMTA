/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";
module.exports = {

	//initialize express
	initExpress: function() {

		//require dependencies
		var xsenv = require("@sap/xsenv");
		var passport = require("passport");
		var xssec = require("@sap/xssec");
		var xsHDBConn = require("@sap/hdbext");
		var express = require("express");
		var bodyParser = require("body-parser");

		//logging
		var logging = require("@sap/logging");
		var appContext = logging.createAppContext();

		//Get instance of express
		var expressApp = express();
		
		//register log handler for all routes
		expressApp.use(logging.expressMiddleware(appContext));

		//set passport strategy for authentication by JWT optained from UAA
		passport.use("JWT", new xssec.JWTStrategy(xsenv.getServices({
			uaa: {
				tag: "xsuaa"
			}
		}).uaa));

		//register passport initialization for all routes
		expressApp.use(passport.initialize());

		//get environment variables for backing service 'hana'
		var hanaOptions = xsenv.getServices({
			hana: {
				tag: 'hana'
			}
		}).hana;
		
		//authorize to Hana and register 'db' connection to all routes
		expressApp.use(
			passport.authenticate("JWT", {  // 1st middleware function
				session: false
			}),
			xsHDBConn.middleware(hanaOptions) //2nd middleware function
		);
		
		//invoke body parser to make req.body available
		expressApp.use(bodyParser.json()); 

		//feedback to caller
		return expressApp;

	},

	//initialize xs classic compatibility module
	initXSJS: function(expressApp) {

		//require dependencies
		var xsjs = require("@sap/xsjs");
		var xsenv = require("@sap/xsenv");

		//prepare XSJS module options
		var options = {
			redirectUrl: "/index.xsjs"
		};

		//prepare XSJS module options: access to HANA
		try {
			options = Object.assign(options, xsenv.getServices({
				hana: {
					tag: "hana"
				}
			}));
		} catch (err) {
			console.error(err);
		}

		//prepare XSJS module options: access to UAA
		try {
			options = Object.assign(options, xsenv.getServices({
				uaa: {
					tag: "xsuaa"
				}
			}));
		} catch (err) {
			console.error(err);
		}

		//start XSJS server providing prepared options
		var xsjsApp = xsjs(options);

		//register XSJS for all /xsjs routes
		expressApp.use("/xsjs", xsjsApp);

	}

};