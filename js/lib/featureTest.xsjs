var conn = $.hdb.getConnection();
var resultSet = conn.executeQuery("select SESSION_CONTEXT('XS_DOCUMENTTYPE') from DUMMY");
$.response.setBody(resultSet[0].CURRENT_UTCTIMESTAMP);
conn.close();