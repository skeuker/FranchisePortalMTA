module.exports = function(grunt) {
	"use strict";
	
	//load grunt SAP UI5 best practice build
	grunt.loadNpmTasks("@sap/grunt-sapui5module-bestpractice-build");
	
	//write to build log
    grunt.log.writeln("\n### grunt.config() ###\n" + JSON.stringify(grunt.config(), null, 2));
    
    //do the build
	grunt.registerTask("default", [
        "lint"
	]);
	
};