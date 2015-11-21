var request = require('request');
var SmartThingsAccessory = require('./SmartThingsAccessory');

function SmartThingsPlatform (log, config) {
	this.log = log;
	this.app_id = config.app_id;
	this.access_token = config.access_token;
}

SmartThingsPlatform.prototype = {
	accessories: function (callback) {
		this.log('Fetching SmartThings devices...');

		var self = this;

		request.get({
			url: 'https://graph.api.smartthings.com/api/smartapps/installations/' + this.app_id +
				'/location?access_token=' + this.access_token,
			json: true
		}, function (error, response, location) {
			if (error || response.statusCode != 200) {
				self.log('Error starting StartThings: ' + error);
			}
			else {
				request.get({
					url: 'https://graph.api.smartthings.com/api/smartapps/installations/' + self.app_id +
						'/devices?access_token=' + self.access_token,
					json: true
				}, function (error, response, devices) {
					if (error || response.statusCode != 200) {
						self.log('Error starting StartThings: ' + error);
					}
					else {
						var foundAccessories = [];

						SmartThingsAccessory.TYPES.filter(function (type) {
							return devices[type];
						}).forEach(function (type) {
							devices[type].forEach(function (device) {
								foundAccessories.push(new SmartThingsAccessory({
									log: self.log,
									location: location,
									name: device.name,
									commands: device.commands,
									attributes: device.attributes,
									Service: SmartThingsPlatform.Service,
									Characteristic: SmartThingsPlatform.Characteristic
								}));
							});
						});

						callback(foundAccessories);
					}
				});
			}
		});
	}
}

module.exports = SmartThingsPlatform;
