"use strict";var loopback=require("loopback"),boot=require("loopback-boot"),app=module.exports=loopback();app.start=function(){return app.listen(function(){app.emit("started");var o=app.get("url").replace(/\/$/,"");if(console.log("Web server listening at: %s",o),app.get("loopback-component-explorer")){var e=app.get("loopback-component-explorer").mountPath;console.log("Browse your REST API at %s%s",o,e)}})},app.stop=function(){process.exit()},boot(app,__dirname,function(o){if(o)throw o;require.main===module&&app.start()});