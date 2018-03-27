"use strict";

//module export
module.exports = function(expressApp, httpServer) {
	
	//register documentStream node module for applicable Url path
	expressApp.use("/node/documentStream", require("./routes/documentStream")());
	
	//register createOrderRequest node module for applicable Url path
	expressApp.use("/node/createOrderRequest", require("./routes/createOrderRequest")());
	
	//register getUserContext node module for applicabel Url path
	expressApp.use("/node/getUserContext", require("./routes/getUserContext")());

};