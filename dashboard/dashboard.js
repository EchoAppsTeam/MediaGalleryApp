(function(jQuery) {

var $ = jQuery;

if (Echo.Control.isDefined("Echo.Apps.MediaGallery.Dashboard")) return;

var dashboard = Echo.Control.manifest("Echo.Apps.MediaGallery.Dashboard");

dashboard.inherits = Echo.Utils.getComponent("Echo.AppServer.Dashboards.AppSettings");

dashboard.dependencies = [{
	"url": "{config:cdnBaseURL.apps.appserver}/controls/configurator.js",
	"control": "Echo.AppServer.Controls.Configurator"
}, {
	"url": "{config:cdnBaseURL.apps.dataserver}/full.pack.js",
	"control": "Echo.DataServer.Controls.Pack"
}, {
	"url": "http://cdn.echoenabled.com/apps/echo/media-gallery/dashboard/data-source.js",
	"control": "Echo.Apps.MediaGallery.InstanceDataSource"
}];

dashboard.labels = {
	"failedToFetchToken": "Failed to fetch customer dataserver token: {reason}",
	"dataserverSubscriptionNotFound": "DataServer product subscription not found.",
	"failedToFetchDomains": "Failed to fetch customer domains: {reason}"
};

dashboard.config = {
	"appkeys": [],
	"janrainapps": []
};

dashboard.config.ecl = [{
	"component": "Select",
	"name": "appkey",
	"type": "string",
	"config": {
		"title": "Application key",
		"desc": "Specifies the application key for this instance",
		"options": []
	}
}, {
	"name": "replies",
	"component": "Checkbox",
	"type": "boolean",
	"default": true,
	"config": {
		"title": "Allow users to post replies",
		"desc": "Check to display replies for each item and provide an ability for the users to post their replies"
	}
}, {
	"name": "likes",
	"component": "Checkbox",
	"type": "boolean",
	"default": true,
	"config": {
		"title": "Allow users to Like items",
		"desc": "Check to enable Likes for the items"
	}
}, {
	"name": "sharing",
	"component": "Checkbox",
	"type": "boolean",
	"default": false,
	"config": {
		"title": "Allow users to share items",
		"desc": "Check to provide an ability for the users to share the items with their friends via social networks"
	}
}, {
	"name": "flags",
	"component": "Checkbox",
	"type": "boolean",
	"default": true,
	"config": {
		"title": "Allow community flagging",
		"desc": "Check to add a button for the users to mark inappropriate content"
	}
}, {
	"name": "itemsPerPage",
	"component": "Input",
	"type": "number",
	"default": 15,
	"config": {
		"title": "Items per page",
		"desc": "Defines the amount of root items per page"
	}
}, {
	"name": "auth",
	"component": "Group",
	"type": "object",
	"config": {
		"title": "Authorization",
		"icons": {"default": {"type": "bootstrap", "source": "icon-user"}}
	},
	"items": [{
		"name": "enabled",
		"component": "Checkbox",
		"type": "boolean",
		"default": true,
		"config": {
			"title": "Enable user authorization",
			"desc": "Check to enable authorization"
		}
	}, {
		"name": "janrainApp",
		"component": "Select",
		"type": "string",
		"config": {
			"title": "Janrain app",
			"desc": "Specifies the janrain application",
			"options": []
		}
	}]
}, {
	"name": "targetURL",
	"component": "Echo.Apps.MediaGallery.DataSourceGroup",
	"type": "string",
	"required": true,
	"config": {
		"title": "",
		"apiBaseURLs": {
			"DataServer": "http://nds.echoenabled.com/api/"
		}
	}
}];

dashboard.init = function() {
	var self = this, parent = $.proxy(this.parent, this);

	var deferreds = [$.Deferred(), $.Deferred()];
	$.when.apply($, deferreds).done(function() {
		var ecl = self._prepareECL(self.config.get("ecl"));
		self.config.set("ecl", ecl);
		parent();
	});

	this._fetchCustomerDomains(deferreds[0].resolve);
	this._fetchDataServerToken(deferreds[1].resolve);
};

dashboard.methods.declareInitialConfig = function() {
	var appkeys = this.config.get("appkeys");
	var janrainapps = this.config.get("janrainapps");
	return {
		"targetURL": this._assembleTargetURL(),
		"appkey": appkeys.length ? appkeys[0].key : undefined,
		"auth": {
			"janrainApp": janrainapps.length ? janrainapps[0].name : undefined
		}
	}
};

dashboard.methods._prepareECL = function(items) {
	var self = this;

	var instructions = {
		"targetURL": function(item) {
			item.config = $.extend({
				"instanceName": self.config.get("instance.name"),
				"domains": self.config.get("domains"),
				"apiToken": self.config.get("dataserverToken"),
				"valueHandler": function() {
					return self._assembleTargetURL();
				}
			}, item.config);
			return item;
		},
		"appkey": function(item) {
			item.config.options = $.map(self.config.get("appkeys"), function(appkey) {
				return {
					"title": appkey.key,
					"value": appkey.key
				};
			});
			return item;
		},
		"auth.janrainApp": function(item) {
			item.config.options = $.map(self.config.get("janrainapps"), function(app) {
				return {
					"title": app.name,
					"value": app.name
				};
			});
			return item;
		}
	};
	return (function traverse(items, path) {
		return $.map(items, function(item) {
			var _path = path ? path + "." + item.name : item.name;
			if (item.type === "object" && item.items) {
				item.items = traverse(item.items, _path);
			} else if (instructions[_path]) {
				item = instructions[_path](item);
			}
			return item;
		});
	})(items, "");
};

// TODO F:1629 get rid of this function when we have the ability to recieve
// this parameters through config
dashboard.methods._fetchCustomerDomains = function(callback) {
	var self = this;
	Echo.AppServer.API.request({
		"endpoint": "customer/{id}/domains",
		"id": this.config.get("customer").id,
		"onData": function(response) {
			self.config.set("domains", response);
			callback.call(self);
		},
		"onError": function(response) {
			self._displayError(self.labels.get("failedToFetchDomains", {"reason": response.data.msg}));
		}
	}).send();
};

// TODO F:1629 get rid of this function when we have the ability to recieve this parameter
// through config
dashboard.methods._fetchDataServerToken = function(callback) {
	var self = this;
	Echo.AppServer.API.request({
		"endpoint": "customer/{id}/subscriptions",
		"id": this.config.get("customer").id,
		"onData": function(response) {
			var token = Echo.Utils.foldl("", response, function(subscription, acc) {
				return subscription.product.name === "dataserver"
					? subscription.extra.token
					: acc;
			});
			if (token) {
				self.config.set("dataserverToken", token);
				callback.call(self);
			} else {
				self._displayError(
					self.labels.get("failedToFetchToken", {
						"reason": self.labels.get("dataserverSubscriptionNotFound")
					})
				);
			}
		},
		"onError": function(response) {
			self._displayError(self.labels.get("failedToFetchToken", {"reason": response.data.msg}));
		}
	}).send();
};

dashboard.methods._displayError = function(message) {
	this.showMessage({
		"type": "error",
		"message": message,
		"target": this.config.get("target")
	});
	this.ready();
};

dashboard.methods._assembleTargetURL = function() {
	var re =  new RegExp("\/" + this.config.get("instance.name") + "$");
	var targetURL = this.config.get("instance.config.targetURL");

	if (!targetURL || !targetURL.match(re)) {
		targetURL =  "http://" + this.config.get("domains")[0] + "/social-source-input/" + this.config.get("instance.name");
	}

	return targetURL;
};

Echo.Control.create(dashboard);

})(Echo.jQuery);
