"use strict";var _beforeSave=require("../utils/beforeSave"),_createLogging=require("../utils/createLogging"),_makeTransaction=require("../utils/makeTransaction"),request=require("request"),Promise=require("bluebird"),EASYSHIP_TOKEN=process.env.EASYSHIP_TOKEN,app=require("../server");module.exports=function(u){function d(e,u,d,l){return e.findById(u.id,{fields:{name:!0,weight:!0,size:!0,cost:!0,deliveryPrice:!0}}).then(function(e){var t=e.weight,n=e.size,r=e.cost,i=e.deliveryPrice,a=n.height,o=n.width,s=n.length,c={description:e.name.en,sku:50,actual_weight:t.value,height:a,width:o,length:s,category:"toys",declared_currency:"HKD",declared_customs_value:r.value||0};return"dynamic"===i.type?(d.push(c),{id:u.prizeId}):"fixed"===i.type?(null!==l&&l.push(i.value),{id:u.prizeId}):null})}(0,_createLogging.loggingModel)(u),(0,_createLogging.loggingRemote)(u,"new"),(0,_createLogging.loggingRemote)(u,"getRate"),(0,_beforeSave.updateTimeStamp)(u),(0,_beforeSave.assignKey)(u),u.observe("after save",function(e,t){e.isNewInstance||e.data&&"sent"===e.data.status&&app.models.Prize.find({where:{status:"pending",deliveryId:e.currentInstance.id}}).then(function(e){0<e.length&&e.forEach(function(e){e.updateAttributes({status:"sent"})})}).catch(function(e){});t()}),u.new=function(_,h){var e=app.models,t=e.Wallet,n=e.User,r=e.Product,i=e.Prize,m=_.address,a=_.cost,o=_.userId,s=_.products,g=_.courier,c=_.target,f=[];function y(t){(0,_makeTransaction.createNewTransaction)(o,a,"delivery","minus",!0).then(function(e){return _.transactionId=e.id,Promise.all([u.create(_),e.newWalletBalance])}).then(function(e){var n=e[0],r=e[1];return i.find({where:{or:t}},function(e,t){Promise.map(t,function(e){return e.updateAttributes({deliveryId:n.id,status:"pending"})}).then(function(){h(null,{delivery:n,newWalletBalance:r})})})})}"user"===c&&n.findById(o,function(e,t){t.updateAttributes({fullName:m.name,address:m,phone:m.phone,contactEmail:m.email})}),t.findOne({where:{userId:o}}).then(function(e){return a>e.balance?h(null,"insufficient_balance"):"fixed_delivery"!==g.courier_name?Promise.map(s,function(e){return d(r,e,f,null)}).then(function(t){var e,n,r,i,a,o,s,c,u,d,l,p;void 0!==t[0]?(e=m,n=f,r=e.countryCode,i=e.city,a=e.postalCode,o=e.state,s=e.name,c=e.line1,u=e.line2,d=e.phone,l=e.email,p={method:"POST",url:"https://api.easyship.com/shipment/v1/shipments",headers:{authorization:"Bearer "+EASYSHIP_TOKEN,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({selected_courier_id:g.courier_id,destination_country_alpha2:r.toUpperCase(),destination_city:i,destination_postal_code:a,destination_state:o||null,destination_name:s,destination_address_line_1:c,destination_address_line_2:u,destination_phone_number:d,destination_email_address:l||null,items:n})},new Promise(function(i,a){request(p,function(e,t,n){e&&((0,_createLogging.loggingFunction)("Delivery | ","Request Easyship create shippment error | ",e,"error"),a(e));var r=JSON.parse(n);i(r.shipment.easyship_shipment_id)})})).then(function(e){return _.easyship_shipment_id=e,y(t)}):h(null,"incorrect_products_format")}):Promise.map(s,function(e){return{id:e.prizeId}}).then(function(e){void 0!==e[0]?y(e):h(null,"incorrect_products_format")}),null}).catch(function(e){(0,_createLogging.loggingFunction)("Delivery | "," Create Delivery Error | ",e,"error"),h(e)})},u.remoteMethod("new",{http:{path:"/new",verb:"post"},accepts:{arg:"data",type:"object",required:!0},returns:{arg:"result",type:"object"}}),u.getRate=function(e,t){var n=e.products,r=e.countryCode,i=e.postalCode,a=app.models,o=a.Product,s=a.ExchangeRate,c=[],u=[];Promise.map(n,function(e){return d(o,e,c,u)}).then(function(){var e,t={method:"POST",url:"https://api.easyship.com/rate/v1/rates",headers:{"cache-control":"no-cache",authorization:"Bearer "+EASYSHIP_TOKEN,"content-type":"application/json",accept:"application/json"},body:JSON.stringify({origin_country_alpha2:"HK",origin_postal_code:null,destination_country_alpha2:r.toUpperCase(),destination_postal_code:i,items:c})};return 0<c.length?(e=t,new Promise(function(i,a){request(e,function(e,t,n){e&&a(e);var r=JSON.parse(n);r.rates.sort(function(e,t){return e.total_charge-t.total_charge}),r.rates.splice(5),i(r.rates)})})):u[0]}).then(function(t){return s.findOne({order:"realValuePerCoin.hkd ASC"}).then(function(e){var o=e.realValuePerCoin;return 0<t.length?Promise.mapSeries(t,function(e){var t=e.courier_id,n=e.courier_name,r=e.min_delivery_time,i=e.max_delivery_time,a=e.total_charge+8;return{courier_id:t,courier_name:n,min_delivery_time:r,max_delivery_time:i,courier_does_pickup:e.courier_does_pickup,total_charge:a,coins_value:Math.round(a/o.hkd)}}):{courier_name:"fixed_delivery",min_delivery_time:7,max_delivery_time:10,total_charge:t,coins_value:Math.round(t/o.hkd)}})}).then(function(e){t(null,e)}).catch(function(e){t(e)})},u.remoteMethod("getRate",{http:{path:"/getRate",verb:"post"},accepts:{arg:"data",type:"object",required:!0},returns:{arg:"result",type:"array"}})};