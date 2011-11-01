//------------------------------------------------------------------------------
// Init
//------------------------------------------------------------------------------
var msgTimers = null;
//
function onOptionPageLoad() {
  msgTimers = {};

  var version = chrome.app.getDetails().version;
  jQuery('#version').text(version);

  var sectionNode = createSection('Icon',
    [['show_stock_on_icon', 'Show watched stock quote'],
     ['icon_switch_interval', 'Switch time interval (seconds)'],
     ['icon_text', 'Text displays'],
     ['icon_color', 'Color represents']
    ], '');
  setSectionDescription(sectionNode.getAttribute('id'),
    "Use the extension icon to display stock quote, which goes through each stock in your watched list.<br\><br\>\
    Configure quote in forms of price or changes. Set the color to represent price change, last tick direction,\
    or trend comparing to the moving average in the last 120 seconds.", false);

  createSection('Stock Input',
    [['enable_suggestions', 'Show symbol suggestions'],
     ['default_exchange', 'Default market']
    ],
    'Symbol suggestions are provided while you are typing.<br\><br\>\
    For non-US stocks, the exchange code is often requred (e.g.: SHA:000001); avoid this by setting default market.');
    
  createSection('Data Refresh', [['data_refresh_interval', 'Refresh time interval (seconds)'], ['shut_down', 'Shut down hours (your local time)']],
    'Set the frequency of stock quotes refresh, and hours you wish to shut down this service (you\'ll still be able to get instant quote).');
    
  createSection('On Startup', [['detail_panel_startup', 'Detail panel displays']],
    'Show details of current "icon stock" or last stock when app opens.');
  
  createSection('Price Alerts', [['desktop_notify', 'Show desktop notifications'], ['notification_dismiss', 'Dismiss notification']],
    'Show mini-popups on desktop for price alerts.');
  
  refreshIconSection();
  refreshStockInputSection();
  refreshAlertsSection();
}
//
function createConfigLine(keyword, fieldTitle, sectionId) {
  var config = getConfig(keyword);
  if (!config)
    return null;
  
  var clNode = document.createElement('div');
  clNode.setAttribute('class', 'config_line');
  
  // field title
  var fNode = document.createElement('div');
  fNode.setAttribute('class', 'field');
  fNode.innerHTML = fieldTitle;
  clNode.appendChild(fNode);
  // value
  var vNode = document.createElement('div');
  vNode.setAttribute('class', 'value');
  clNode.appendChild(vNode);
  // value control
  if (config.type == 'option' || config.type == 'bool') {
    var ctrlNode = document.createElement('select');
    ctrlNode.setAttribute('id', 'ctrl_' + keyword);
    ctrlNode.setAttribute('class', 'droptext');
    ctrlNode.setAttribute('onchange', "onConfigValueChanged('" + keyword + "', '" + sectionId + "')");
    vNode.appendChild(ctrlNode);
    
    var droplist = config.type == 'option' ? config.getOptionDisplays() : ['No', 'Yes'];
    var item = null;
    var maxItemSize = 0;
    var optNode = null;
    for (var i = 0; i < droplist.length; ++ i) {
      optNode = document.createElement('option');
      optNode.setAttribute('value', i);
      
      if ((config.type == 'option' && config.valIndex == i) || (config.type == 'bool' && config.val == i))
        optNode.setAttribute('selected', 'selected');
      
      item = droplist[i];
      optNode.innerHTML = item;
      ctrlNode.appendChild(optNode);
      
      if (typeof(item) == 'number') {
      }
      else if (item.length > maxItemSize)
        maxItemSize = item.length;
    }
    // Set option box size
    ctrlNode.setAttribute('style', 'width:' + (maxItemSize > 10 ? maxItemSize*7.5 + 15 : 88) + 'px');
  } else { // TODO: other config types
  }
  return clNode;
}
//
function createSection(sectionTitle, configItems, description) {
  // - configItems: e.g. [['show_stock_on_icon', 'Show stock on icon'], ['icon_switch_interval', 'Icon switch time interval']]

  var sectionNode = document.createElement('div');
  sectionNode.setAttribute('class', 'section');
  var sectionId = 'section_' + sectionTitle.replace(/\s/g, '_').toLowerCase();
  sectionNode.setAttribute('id', sectionId);
  sectionNode.setAttribute('onmouseover', 'onMouseOverSection(this.id)');
  sectionNode.setAttribute('onmouseout', 'onMouseOutSection(this.id)');
  
  var cpNode = document.createElement('div');
  cpNode.setAttribute('class', 'config_panel');
  sectionNode.appendChild(cpNode);
  
  var snNode = document.createElement('div');
  snNode.setAttribute('class', 'section_name');
  snNode.innerHTML = sectionTitle;
  cpNode.appendChild(snNode);
  
  var item = null;
  for (var i = 0; i < configItems.length; ++ i) {
    item = configItems[i];
    if (item.length == 2)
      cpNode.appendChild(createConfigLine(item[0], item[1], sectionId));
  }
  
  var rNode = document.createElement('div');
  rNode.setAttribute('class', 'remark_panel');
  sectionNode.appendChild(rNode);
  
  var dNode = document.createElement('div');
  dNode.setAttribute('class', 'description no_display');
  dNode.innerHTML = description;
  rNode.appendChild(dNode);
  
  jQuery('#sections').append(sectionNode);
  return sectionNode;
}
function setSectionDescription(sectionId, description, plainText) {
  if (plainText)
    jQuery('#' + sectionId + ' .remark_panel .description').text(description);
  else
    jQuery('#' + sectionId + ' .remark_panel .description').html(description);
}



//------------------------------------------------------------------------------
// Sections
//------------------------------------------------------------------------------
function refreshIconSection() {
  var config = getConfig('show_stock_on_icon');
  if (config && config.getValue()) {
    jQuery('#ctrl_icon_switch_interval').removeAttr('disabled');
    jQuery('#ctrl_icon_color').removeAttr('disabled');
    jQuery('#ctrl_icon_text').removeAttr('disabled');
  } else {
    jQuery('#ctrl_icon_switch_interval').attr('disabled', 'disabled');
    jQuery('#ctrl_icon_color').attr('disabled', 'disabled');
    jQuery('#ctrl_icon_text').attr('disabled', 'disabled');
  }
}
//
function refreshStockInputSection() {
  var config = getConfig('enable_suggestions');
  if (config && config.getValue()) {
    jQuery('#ctrl_default_exchange').attr('disabled', 'disabled');
  } else {
    jQuery('#ctrl_default_exchange').removeAttr('disabled');
  }
}
//
function refreshAlertsSection() {
  var config = getConfig('desktop_notify');
  if (config && config.getValue()) {
    jQuery('#ctrl_notification_dismiss').removeAttr('disabled');
  } else {
    jQuery('#ctrl_notification_dismiss').attr('disabled', 'disabled');
  }
}


//------------------------------------------------------------------------------
// Notifications
//------------------------------------------------------------------------------
function postNotification(sectionId, status, content, timeout) {
  dimissSectionNotification(sectionId);
  
  var remarkPanelNode = jQuery('#' + sectionId + ' .remark_panel');
  // hide description
  remarkPanelNode.children('.description').hide();
  // show msg
  var msgNode = document.createElement('div');
  msgNode.setAttribute('id', 'msg_' + sectionId);
  msgNode.setAttribute('class', status.toLowerCase() == 'ok' ? 'msg_ok' : 'msg_err');
  msgNode.innerHTML = content;
  remarkPanelNode.prepend(msgNode);
  // scheldue dismiss
  if (!timeout)
    timeout = 5;
  msgTimers[sectionId] = window.setTimeout("dimissSectionNotification('" + sectionId + "')", timeout * 1000);
}
function dimissSectionNotification(sectionId) {
  // clear timer
  var timer = msgTimers[sectionId];
  if (timer)
    window.clearTimeout(timer);
  msgTimers[sectionId] = null;
  // remove msg
  jQuery('#msg_' + sectionId).remove();
}



//------------------------------------------------------------------------------
// Event handlers
//------------------------------------------------------------------------------
function onMouseOverSection(sectionId) {
  if(msgTimers[sectionId])
    return;
  jQuery('#' + sectionId + ' .remark_panel .description').show();
}
//
function onMouseOutSection(sectionId) {
  if(msgTimers[sectionId])
    return;
  jQuery('#' + sectionId + ' .remark_panel .description').hide();
}
//
function onConfigValueChanged(configKeyword, sectionId) {
  var config = getConfig(configKeyword);
  if (!config)
    return;
  if (config.type == 'option') {
    var newValIndex = parseInt(jQuery('#ctrl_' + configKeyword + ' option:selected').val());
    if (newValIndex == config.valIndex)
      return;
    config.setValueByIndex(newValIndex);
    config.saveToLS();
  } else if (config.type == 'bool') {
    var newVal = parseInt(jQuery('#ctrl_' + configKeyword + ' option:selected').val());
    if (newVal == config.val)
      return;
    config.setValue(newVal);
    config.saveToLS();
  } else { // TODO
  }
  onConfigValueChangedFollowup(config, sectionId);
}
//
function onConfigValueChangedFollowup(config, sectionId) {
  var keyword = config.getKeyword();
  var msg = 'Your change is applied.';
  var timeout = 5;
  if (keyword == 'detail_panel_startup') {
    if (config.valIndex == 0) // show nothing
      saveStrToLS('detail_panel_stock', '');
  } else if (keyword == 'show_stock_on_icon') {
    refreshIconSection();
    var config2 = getConfig('icon_switch_interval');
    if (config2) {
      msg = 'Your change will be applied within ' + config2.getValue() + ' seconds.';
      timeout = config2.getValue();
    }
  } else if (keyword == 'icon_color' || keyword == 'icon_text') {
    var config2 = getConfig('icon_switch_interval');
    if (config2) {
      msg = 'Your change will be applied within ' + config2.getValue() + ' seconds.';
      timeout = config2.getValue();
    }
  } else if (keyword == 'data_refresh_interval') {
    recentQuotesLimit = (config.getValue() == 45 ? 3 : 120 / config.getValue());
    saveStrToLS('recent_quotes_limit', recentQuotesLimit);
  } else if (keyword == 'enable_suggestions') {
    refreshStockInputSection();
  } else if (keyword == 'desktop_notify') {
    refreshAlertsSection();
  }
  postNotification(sectionId, 'ok', msg, timeout);
}
