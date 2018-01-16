//Implementation of GET call
function handleGet() {
	
	//create email 
	var mail = new $.net.Mail({
	    sender: {address: "skeuker@pnp.co.za"},
	    to: [{ address: "skeuker@pnp.co.za"}],
	    subject: "XSJS Email Test",
	    parts: [ new $.net.Mail.Part({
	        type: $.net.Mail.Part.TYPE_TEXT,
	        text: "The body of the mail.",
	        contentType: "text/plain"
	    })]
	});

	//send mail
	var returnValue = mail.send();
	
	//compile response
	var sResponse = "MessageId = " + returnValue.messageId + ", final reply = " + returnValue.finalReply;
    
    //set document content
	$.response.setBody(sResponse);

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
		            handlePost();
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
