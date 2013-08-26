(function(jQuery) {
"use strict";

var $ = jQuery;

// TODO F:1630 we should move this class into dataserver component
var dataSource = Echo.Control.manifest("Echo.Apps.MediaGallery.DataSourceGroup");

if (Echo.Control.isDefined(dataSource)) return;

dataSource.inherits = Echo.Utils.getComponent("Echo.AppServer.Controls.Configurator.Item"); 

dataSource.labels = {
	"dataserverBundleName": "Echo Media Gallery Auto-Generated Bundle for {instanceName}",
	"errorRetrievingMeta": "Error retrieving meta",
	"errorRetrievingBundles": "Error retrieving bundles"
};

dataSource.config = {
	"domains": [],
	"apiToken": "",
	"instanceName": ""
};

dataSource.init = function() {
	var self = this, requests = [];

	$.map(["ins", "outs"], function(type) {
		requests.push({
			"endpoint": "meta/" + type,
			"onData": function(data) {
				self.set("meta." + type, data);
			},
			"onError": function(data, options) {
				self._displayError(self.labels.get("errorRetrievingMeta"));
				self.ready();
			}
		});
	  });

	requests.push({
		"endpoint": "packs",
		"onData": function(data, options) {
			var expectedTitle = self.labels.get("dataserverBundleName", {"instanceName": self.config.get('instanceName')});
			var data = $.grep(data, function(d) { return d.title === expectedTitle; })[0] || {"title": expectedTitle};
			var pack = self._createPack(data);

			var renderCallback = function() {
				self.set("pack", pack);
				self.render();
				self.ready();
			};

			if (data.url) {
				renderCallback();
				return;
			}

			pack.create({
				"success": function() {
					pack.out.render();
					var outData = {
						"conf": {"targets": [self.value()]}
					}
					pack.get("out").update({
						"data": outData,
						"success": function() {
							renderCallback();
						}
					});
				}
			});
		},
		"onError": function(data, options) {
			self._displayError(self.labels.get("errorRetrievingBundles"));
			self.ready();
		}
	});

	this._apiCall(requests);
};

dataSource.templates.main = 
	'<div class="{class:container}">' +
		'<div class="{class:content}"></div>' +
		'<div class="{class:value}"></div>' +
	'</div>';

dataSource.renderers.content = function(element) {
	var pack = this.get("pack");
	pack.render();
	return element
		.empty()
		.append(pack.config.get("target")[0]);
};

dataSource.methods.value = function() {
	return this.config.get("valueHandler")();
};

dataSource.methods._displayError = function(message) {
	this.events.publish({
		"topic": "onErrorStateChange",
		"inherited": true,
		"data": {
			"message": message,
			"error": true
		}
	});
};

dataSource.methods._createPack = function(data) {
	return new Echo.DataServer.Controls.Dashboard.Pack({
		"target": $("<div>"),
		"meta": this.get("meta"),
		"domains": this.config.get("domains"),
		"apiToken": this.config.get("apiToken"),
		"apiBaseURL": this.config.get("apiBaseURLs.DataServer"),
		"cdnBaseURL": this.config.get("cdnBaseURL"),
		"data": data,
		"plugins": [{
			"name": "HideSettings"
		}]
	});
};

dataSource.methods._apiCall = function(params) {
	var self = this;
	if (!params.length) return;

	var config = params.shift();
	Echo.DataServer.API.request({
		"endpoint": config.endpoint,
		"apiToken": this.config.get("apiToken"),
		"apiBaseURL": this.config.get("apiBaseURLs.DataServer"),
		"data": config.data || {},
		"onData": function(data, options) {
			config.onData.call(self, data.data, options);
			self._apiCall(params);
		},
		"onError": function(data, options) {
			config.onError.call(self, data, options);
		}
	}).send();
};

Echo.Control.create(dataSource);

// TODO F:1630 move this logic to the dataserver component
// (hide settings&change title) and get rid of this plugin
var settingsHidingPlugin = Echo.Plugin.manifest("HideSettings", "Echo.DataServer.Controls.Dashboard.Pack");

if (Echo.Plugin.isDefined(settingsHidingPlugin)) return;

settingsHidingPlugin.labels = {
	"packTitle": "Data Source"
};

settingsHidingPlugin.component.renderers.toolbar = function(element) {
	return element.empty();
};

settingsHidingPlugin.component.renderers.settings = function(element) {
	this.parentRenderer("settings", arguments);
	return element.hide();
};

settingsHidingPlugin.component.renderers.title = function(element) {
	return element
		.empty()
		.append(this.labels.get("packTitle"));
};

settingsHidingPlugin.css =
	'.{plugin.class} .{class:header} { margin-left: -7px; }' +
	'.{plugin.class} .{class:title} { color: #787878; }';

Echo.Plugin.create(settingsHidingPlugin);

})(Echo.jQuery);
