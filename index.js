// SmartThings JSON API SmartApp required
// https://github.com/alindeman/homebridge-smartthings/blob/master/JSON.groovy

var request = require('request');

var Service, Characteristic, Accessory, uuid;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;
	uuid = homebridge.hap.uuid;

	homebridge.registerPlatform('homebridge-smartthings', 'SmartThings', SmartThingsPlatform);
}

function SmartThingsPlatform (log, config) {
	this.log = log;
	this.app_id = config.app_id;
	this.access_token = config.access_token;
}

SmartThingsPlatform.prototype = {
	accessories: function (callback) {
		this.log('Fetching SmartThings devices...');

		var self = this;
		var foundAccessories = [];

		request.get({
			url: 'https://graph.api.smartthings.com/api/smartapps/installations/'+self.app_id+'/location?access_token='+self.access_token,
			json: true
		}, function (err, response, location) {
			if (err || response.statusCode != 200) {
				self.log('Error starting StartThings: ' + err);
			}
			else {
				request.get({
					url: 'https://graph.api.smartthings.com/api/smartapps/installations/'+self.app_id+'/devices?access_token='+self.access_token,
					json: true
				}, function (err, response, json) {
					if (err || response.statusCode != 200) {
						self.log('Error starting StartThings: ' + err);
					}
					else {
						[
							'switches',
							'hues',
							'thermostats'
						].forEach(function (key) {
							if (json[key]) {
								json[key].forEach(function (thing) {
									var accessory = new SmartThingsAccessory(self.log, location, thing.name, thing.commands, thing.attributes);
									foundAccessories.push(accessory);
								});
							}
						});

						callback(foundAccessories);
					}
				});
			}
		});
	}
}

function SmartThingsAccessory(log, location, name, commands, attributes) {
	this.log = log;
	this.location = location;
	this.name = name;
	this.commands = commands;
	this.attributes = attributes;
}

SmartThingsAccessory.prototype.getServices = function () {
	var services = [];

	var accessoryInformationService = new Service.AccessoryInformation();
	accessoryInformationService
		.setCharacteristic(Characteristic.Name, this.name)
		.setCharacteristic(Characteristic.Manufacturer, 'SmartThings')
		.setCharacteristic(Characteristic.Model, 'Rev-1')
		.setCharacteristic(Characteristic.SerialNumber, 'A1S2NASF88EW');
	services.push(accessoryInformationService);

	var commands = this.commands;

	if (commands.on && commands.setLevel) {
		var lightbulbService = new Service.Lightbulb(this.name);
		lightbulbService.getCharacteristic(Characteristic.On)
			.on('set', this.setOn.bind(this))
			.on('get', this.getOn.bind(this));
		lightbulbService.getCharacteristic(Characteristic.Brightness)
			.on('set', this.setBrightness.bind(this))
			.on('get', this.getBrightness.bind(this))

		if (commands.setHue) {
			lightbulbService.getCharacteristic(Characteristic.Hue)
				.on('set', this.setHue.bind(this))
				.on('get', this.getHue.bind(this))
		}
		if (commands['setSaturation']) {
			lightbulbService.getCharacteristic(Characteristic.Saturation)
				.on('set', this.setSaturation.bind(this))
				.on('get', this.getSaturation.bind(this))
		}

		services.push(lightbulbService);
	}
	else if (commands.on) {
		var switchService = new Service.Switch(this.name);
		switchService.getCharacteristic(Characteristic.On)
			.on('set', this.setOn.bind(this))
			.on('get', this.getOn.bind(this));

		services.push(switchService);
	}
	else if (commands.setHeatingSetpoint || commands.setCoolingSetpoint) {
		var thermostatService = new Service.Thermostat(this.name);
		thermostatService.getCharacteristic(Characteristic.CurrentTemperature)
			.on('get', this.getCurrentTemperature.bind(this));
		thermostatService.getCharacteristic(Characteristic.TargetTemperature)
			.on('get', this.getTargetTemperature.bind(this))
			.on('set', this.setTargetTemperature.bind(this));
		thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
			.on('get', this.getCurrentHeatingCoolingState.bind(this));
		thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState)
			.on('get', this.getTargetHeatingCoolingState.bind(this))
			.on('set', this.setTargetHeatingCoolingState.bind(this));
		thermostatService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
			.on('get', this.getTemperatureDisplayUnits.bind(this));

		services.push(thermostatService);
	}

	return services;
}

SmartThingsAccessory.prototype.setOn = function (value, callback) {
	this.command(value === 0 ? 'off' : 'on', callback);
}

SmartThingsAccessory.prototype.getOn = function (callback) {
	callback = callback || function () {};
	this.currentValue('switch', function (err, value) {
		if (err) {
			callback(err);
			return;
		}

		switch (value) {
		case 'on':
			callback(null, 1);
			break;
		default:
			callback(null, 0);
		}
	});
}

SmartThingsAccessory.prototype.setBrightness = function (value, callback) {
	this.command('setLevel', value, callback);
}

SmartThingsAccessory.prototype.getBrightness = function (callback) {
	this.currentValue('level', callback);
}

SmartThingsAccessory.prototype.setHue = function (value, callback) {
	this.command('setHue', value, callback);
}

SmartThingsAccessory.prototype.getHue = function (callback) {
	this.currentValue('hue', callback);
}

SmartThingsAccessory.prototype.setSaturation = function (value, callback) {
	this.command('setSaturation', value, callback);
}

SmartThingsAccessory.prototype.getSaturation = function (callback) {
	this.currentValue('saturation', callback);
}

SmartThingsAccessory.prototype.getCurrentTemperature = function (callback) {
	this.currentValue('temperature', callback);
}

SmartThingsAccessory.prototype.getTargetTemperature = function (callback) {
	var self = this;
	callback = callback || function () {};
	this.getTargetHeatingCoolingState(function (err, mode) {
		if (err) {
			callback(err);
		}
		else {
			switch (mode) {
			case Characteristic.TargetHeatingCoolingState.COOL:
				self.currentValue('coolingSetpoint', callback);
				break;
			case Characteristic.TargetHeatingCoolingState.HEAT:
				self.currentValue('heatingSetpoint', callback);
				break;
			case Characteristic.TargetHeatingCoolingState.AUTO:
				// TODO
					callback('unimplemented');
				break;
			default:
				callback(null, undefined);
			}
		}
	});
}

SmartThingsAccessory.prototype.setTargetTemperature = function (value, callback) {
	var self = this;
	callback = callback || function () {};
	this.getTargetHeatingCoolingState(function (err, mode) {
		if (err) {
			callback(err);
		}
		else {
			switch (mode) {
			case Characteristic.TargetHeatingCoolingState.COOL:
				self.command('setCoolingSetpoint', value, callback);
				break;
			case Characteristic.TargetHeatingCoolingState.HEAT:
				self.command('setHeatingSetpoint', value, callback);
				break;
			case Characteristic.TargetHeatingCoolingState.AUTO:
				// TODO
					callback('unimplemented');
				break;
			default:
				callback('target state is off');
			}
		}
	});
}

SmartThingsAccessory.prototype.getCurrentHeatingCoolingState = function (callback) {
	callback = callback || function () {};
	this.currentValue('thermostatOperatingState', function (err, mode) {
		if (err) {
			callback(err);
		}
		else {
			switch (mode) {
			case 'cooling':
				callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
				break;
			case 'heating':
				callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
				break;
			default:
				callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
			}
		}
	});
}

SmartThingsAccessory.prototype.getTargetHeatingCoolingState = function (callback) {
	callback = callback || function () {};
	this.currentValue('thermostatMode', function (err, mode) {
		if (err) {
			callback(err);
		}
		else {
			switch (mode) {
			case 'cool':
				callback(null, Characteristic.TargetHeatingCoolingState.COOL);
				break;
			case 'heat':
				callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
				break;
			case 'auto':
				callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
				break;
			default:
				callback(null, Characteristic.TargetHeatingCoolingState.OFF);
			}
		}
	});
}

SmartThingsAccessory.prototype.setTargetHeatingCoolingState = function (value, callback) {
	var cmdValue = null;
	switch (value) {
	case Characteristic.TargetHeatingCoolingState.COOL:
		cmdValue = 'cool';
		break;
	case Characteristic.TargetHeatingCoolingState.HEAT:
		cmdValue = 'heat';
		break;
	case Characteristic.TargetHeatingCoolingState.AUTO:
		cmdValue = 'range';
		break;
	case Characteristic.TargetHeatingCoolingState.OFF:
		cmdValue = 'off';
		break;
	}

	if (cmdValue) {
		this.command('setThermostatMode', cmdValue, callback);
	}
	else {
		callback && callback('unknown target heating cooling state');
	}
}

SmartThingsAccessory.prototype.getTemperatureDisplayUnits = function (callback) {
	// TODO
	callback && callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
}

SmartThingsAccessory.prototype.command = function (command, value, callback) {
	if (typeof value === 'function') {
		callback = value;
		value = undefined;
	}

	var url = this.commands[command];
	var body = {};
	if (value) {
		body.value = value;
	}

	this.log(this.name + ' sending command ' + command + '(' + value + ')');

	callback = callback || function () {};

	var self = this;
	request.put({
		url: url,
		json: true,
		body: body
	}, function (err, response, body) {
		if (err) {
			self.log(self.name + ' error sending command: ' + url);
			callback('error sending command');
		}
		else {
			callback(null);
		}
	});
}

SmartThingsAccessory.prototype.currentValue = function (attribute, callback) {
	var url = this.attributes[attribute];
	var self = this;
	callback = callback || function () {};

	request.get({
		url: url
	}, function (err, response, body) {
		if (err || response.statusCode !== 200) {
			self.log(self.name + ' error getting attribute: ' + url);
			callback('error getting attribute');
		} else {
			var obj = JSON.parse(body);
			if (obj.currentValue) {
				callback(null, obj.currentValue);
			}
			else {
				callback('current value not available');
			}
		}
	});
}
