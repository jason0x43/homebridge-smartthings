homebridge-smartthings
======================

SmartThings plugin for [Homebridge](https://github.com/nfarina/homebridge).

This repository contains a SmartThings plugin for Homebridge that is based up the version previously bundled in the main homebridge repository.

Installation
------------

1. Install homebridge with `npm install -g homebridge`
2. Install this version of homebridge-smartthings with `npm install -g https://github.com/jason0x43/homebridge-smartthings`
3. Install the JSON API SmartThings app in your account at `graph.ide.smartthings.com`
3. Update your config file; see the sample snippet below

Configuration
-------------

Sample configuration:

```js
{
    platforms: [
        {
            "platform": "SmartThings",
            "name": "SmartThings",
            "app_id": "00000000-0000-0000-0000-000000000000",
            "access_token": "00000000-0000-0000-0000-000000000000"
        }
    ]
}
```

The get the proper values for the `app_id` and `access_token` parameters, open the JSON API smart app in the SmartThings app on your mobile device and select "Config".
