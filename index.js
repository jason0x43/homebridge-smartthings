// SmartThings JSON API SmartApp required
// https://github.com/alindeman/homebridge-smartthings/blob/master/JSON.groovy

var SmartThingsPlatform = require('./lib/SmartThingsPlatform');

module.exports = function (homebridge) {
	SmartThingsPlatform.Service = homebridge.hap.Service;
	SmartThingsPlatform.Characteristic = homebridge.hap.Characteristic;
	SmartThingsPlatform.Accessory = homebridge.hap.Accessory;
	SmartThingsPlatform.uuid = homebridge.hap.uuid;
	homebridge.registerPlatform('homebridge-smartthings', 'SmartThings', SmartThingsPlatform);
}
