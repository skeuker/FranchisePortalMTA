"use strict";

//module export
module.exports = function(expressApp, httpServer) {
	
	//register documentStream node module for applicable Url path
	expressApp.use("/node/documentStream", require("./routes/documentStream")());
	
	//Url path for testing functionality
	expressApp.use("/node/featureTest", require("./routes/featureTest")());
	
};