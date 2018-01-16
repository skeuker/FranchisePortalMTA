/*eslint no-console: 0, no-unused-vars: 0*/
"use strict";

//prepare http server
var port = process.env.PORT || 3000;
var httpServer = require("http").createServer();
global.__base = __dirname + "/";
var init = require(global.__base + "utils/initialize");

//initialize Express module
var expressApp = init.initExpress();

//intialize express router
require("./router")(expressApp, httpServer);

//Initialize the XSJS module
init.initXSJS(expressApp);

//register HTTP request handler 
httpServer.on("request", expressApp);

//Start the http server 
httpServer.listen(port, function() {
	console.info("HTTP server listening on port " + httpServer.address().port);
});
