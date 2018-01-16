//Implementation of GET call
function handleGet() {
	
	//get database connection
	var conn = $.db.getConnection();
	
	//get CDS API for this database connection
	var XSDS = $.require("@sap/cds").xsjs(conn); // “cds” 
	
	//for each parameter
	var sDocumentID = $.request.parameters.get("documentID");

	// import CDS document entity handler
	var oDocumentEntityHandler = XSDS.$importEntity("pnp.hana.portal", "FranchisePortal.Document");
	
	// import CDS document stream entity handler
	var oDocumentStreamEntityHandler = XSDS.$importEntity("pnp.hana.portal", "FranchisePortal.DocumentStream");

	// retrieve document entity instance
	var oDocument = oDocumentEntityHandler.$get({ documentID: sDocumentID });
	
	// retrieve document stream entity instance
	var oDocumentStream = oDocumentStreamEntityHandler.$get({ documentID: sDocumentID });
	
	//base64 decode to render document content as binary
	var xDocumentContent = $.util.codec.decodeBase64(oDocumentStream.$_fields.documentContent);

	//set response body according to document mime type
    $.response.contentType = oDocument.$_fields.mimeType;
    
    //set content disposition
    $.response.headers.set('Content-Disposition', "inline; filename = " + oDocument.$_fields.fileName);
    
    //set document content
	$.response.setBody(xDocumentContent);
	
	//Set response ok code
	$.response.status = $.net.http.OK;
	
}

//Implementation of POST call
function handlePost() {
	
	var bodyStr = $.request.body ? $.request.body.asString() : undefined;
	if ( bodyStr === undefined ){
		 $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
		 return {"myResult":"Missing BODY"};
	}
	// Extract body insert data to DB and return results in JSON/other format
	$.response.status = $.net.http.CREATED;
    return {"myResult":"POST success"};
    
}

// Check Content type headers and parameters
function validateInput() {
	return true;
}

// Request process 
function processRequest(){
	
	if (validateInput()){
		try {
		    switch ( $.request.method ) {
		        //Handle your GET calls here
		        case $.net.http.GET:
		        	handleGet();
		            break;
		            //Handle your POST calls here
		        case $.net.http.POST:
		            $.response.setBody(JSON.stringify(handlePost()));
		            break; 
		        //Handle your other methods: PUT, DELETE
		        default:
		            $.response.status = $.net.http.METHOD_NOT_ALLOWED;
		            $.response.setBody("Wrong request method");		        
		            break;
		    }    
		} catch (e) {
		    $.response.setBody("Some error occured: " + e.toString());
		}
	}
}

// Call request processing  
processRequest();


