(function(jQuery) {
"use strict";

var $ = jQuery;

var gallery = Echo.App.manifest("Echo.Apps.MediaGallery");

if (Echo.App.isDefined(gallery)) return;

gallery.init = function() {
	if (!this.checkAppKey()) return;

	this.render();
	this.ready();
};

gallery.labels = {
	"signin": "Please sign in..."
};

gallery.config = {
	"targetURL": undefined,
	"auth": {
		"enabled": true,
		"janrainApp": undefined
	},
	"itemsPerPage": 15,
	// We use SystemFlagged state to avoid false-positive responses from spam filter.
	"itemState": "Untouched,SystemFlagged,ModeratorApproved",
	"replies": true,
	"likes": true,
	"flags": true,
	"sharing": false
};

gallery.dependencies = [{
	"url": "{config:cdnBaseURL.sdk}/identityserver.pack.js",
	"app": "Echo.IdentityServer.Controls.Auth"
}, {
	"url": "{config:cdnBaseURL.sdk}/streamserver.pack.js",
	"app": "Echo.StreamServer.Controls.Stream"
}, {
	"url": "{config:cdnBaseURL.sdk}/streamserver/plugins/pinboard-visualization.js",
	"plugin": "Echo.StreamServer.Controls.Stream.Plugins.PinboardVisualization"
}];

gallery.templates.main =
	'<div class="{class:container}">' +
		'<div class="{class:auth}"></div>' +
		'<div class="{class:stream}"></div>' +
	'</div>';

gallery.renderers.auth = function(element) {
	if (!this._isAuthEnabled()) {
		return element.hide();
	}
	this.initComponent({
		"id": "Auth",
		"component": "Echo.IdentityServer.Controls.Auth",
		"config": {
			"target": element,
			"infoMessages": {"enabled": false},
			"labels": {"login": this.labels.get("signin")},
			"plugins": [this._getAuthPluginDefinition({"name": "JanrainConnector"})]
		}
	});
	return element;
};

gallery.renderers.stream = function(element) {
	var self = this;
	var janrainApp = this.config.get("auth.janrainApp");
	var plugins = [{
		"name": "PinboardVisualization"
	}, {
		"name": "ItemsRollingWindow",
		"moreButton": true,
		"url": "http://cdn.echoenabled.com/apps/echo/dataserver/v3/plugins/items-rolling-window.js"
	}];
	var itemState = this.config.get("itemState");
	var childrenQuery = this.config.get("replies")
		? "children:1 state:" + itemState
		: "children:0";
	var query = "childrenof:" + this.config.get("targetURL", "") +
			" itemsPerPage:" + this.config.get("itemsPerPage") +
			" state:" + itemState + " " + childrenQuery;

	var isEnabled = function(name) {
		return !!self.config.get(name);
	};
	if (isEnabled("replies")) {
		var reply = {"name": "Reply"};
		if (this._isAuthEnabled()) {
			var auth = this._getAuthPluginDefinition({
				"name": "JanrainAuth",
				"labels": {"login": this.labels.get("signin")}
			});
			reply.nestedPlugins = [auth];
		}
		plugins.push(reply);
	}
	if (isEnabled("sharing") && janrainApp) {
		plugins.push({
			"name": "JanrainSharing",
			"appId": janrainApp
		});
	}
	if (isEnabled("likes")) {
		plugins.push({"name": "Like"});
	}
	if (isEnabled("flags")) {
		plugins.push({"name": "CommunityFlag"});
	}
	this.initComponent({
		"id": "Stream",
		"component": "Echo.StreamServer.Controls.Stream",
		"config": {
			"target": element,
			"query": query,
			"plugins": plugins,
			"slideTimeout": 0,
			"item": {
				"viaLabel": {"icon": true}
			}
		}
	});
	return element;
};

gallery.methods._isAuthEnabled = function() {
	return this.config.get("auth.enabled") && !!this.config.get("auth.janrainApp");
};

gallery.methods._getAuthPluginDefinition = function(config) {
	return $.extend({
		"buttons": ["login"],
		"title": this.labels.get("signin"),
		"width": 270,
		"height": 290,
		"appId": this.config.get("auth.janrainApp")
	}, config);
};

gallery.css =
	".{class:auth} { float: left; margin: 0px 0px 10px 10px; }" +
	".{class:stream} { clear: both; }" +

	// Auth app CSS overrides...
	".{class:container} .echo-identityserver-controls-auth-name { margin-right: 10px; }" +
	".{class:container} .echo-streamserver-controls-stream-item-plugin-Reply-submitForm .echo-identityserver-controls-auth-logout { font-size: 12px; margin-top: 0px; }" +
	".{class:container} .echo-identityserver-controls-auth-logout { font-size: 12px; margin-top: 6px; }" +
	".{class:container} .echo-identityserver-controls-auth-name { font-size: 16px; }" +

	// Stream app CSS overrides...
	".{class:container} .echo-streamserver-controls-stream-item-mediagallery-item img { width: 100% }" +
	".{class:container} .echo-streamserver-controls-stream-item-mediagallery-item iframe { width: 100% }" +
	".{class:container} .echo-streamserver-controls-stream-header { display: none; }";

Echo.App.create(gallery);

})(Echo.jQuery);
