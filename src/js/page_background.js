//------------------------------------------------------------------------------
// Init
//------------------------------------------------------------------------------
var _canvasContext = null;
var _slm_bg = null;
//
function backgroundPageInit() {
  initSymbolLists();
  initSettings();
  initData();
  processUpgrade();
  startBackgroundTasks();
}
//
function startBackgroundTasks() {
  loopRefreshData();
  loopChangeIcon();
  loopAssessStatuses();
}
//
function processUpgrade() {
  var currentVer = chrome.app.getDetails().version;
  if (currentVer == getStrFromLS('_version', '')) {
    return;
  }
  
  var sl = _slm_bg.getListById('sl_indexes');
  sl.del('INDEXDJSTOXX:SX5E');
  
  saveStrToLS('_version', currentVer);
}
//
function initSettings() {
  // Section - Icon
  initBooleanConfig('show_stock_on_icon', 1);
  initOptionConfig('icon_switch_interval', [5, 6, 7, 8, 9, 10, 12, 15], 5);
  initOptionConfig('icon_text', ['Current price', 'Price change', 'Percentage change'], 'Current price');
  initOptionConfig('icon_color', ['Price change', 'Last tick', 'Moving trend'], 'Last tick');
  
  // Section - Data refresh
  initOptionConfig('data_refresh_interval', [10, 15, 20, 30, 45, 60], 10);
  initOptionConfig('shut_down', ['Never', '8PM ~ 7AM', 'Midnight ~ 7AM'], 'Midnight ~ 7AM');
  
  // Section - Startup
  initOptionConfig('detail_panel_startup', ['Nothing', 'Icon Stock', 'Last Stock'], 'Nothing');
  
  // Section - Stock Input
  initBooleanConfig('enable_suggestions', 1);
  
  var config = initOptionConfig('default_exchange', getMarketsCodes(), 'USA');
  config.setOptionDisplays(getMarketsNames());
  
  // Section - Notification
  initBooleanConfig('desktop_notify', 1);
  config = initOptionConfig('notification_dismiss', [0, 15, 30, 60, 120], 30);
  config.setOptionDisplays(['Manually', '15 seconds', '30 seconds', '1 minute', '2 minutes']);
}
//
function initData() {
  clearStockData();

  localStorage.removeItem('detail_panel_stock');
  
  var watchList = getSymbolListManagerFromLS().getListById('sl_watch');
  saveStrToLS('icon_stock', watchList.at(0));

  saveStrToLS('refresh_data', '1');
  
  var recentQuotesLimit = 12;
  var config = getConfig('data_refresh_interval');
  if (config)
    recentQuotesLimit = (config.getValue() == 45 ? 3 : 120 / config.getValue());
  saveStrToLS('recent_quotes_limit', recentQuotesLimit);
  
  // position manager
  if (!getPositionManagerFromLS()) {
    var pm = new PositionManager();
    pm.saveToLS();
  }
    
  // get canvas context
  var canvas = document.getElementById('canvas');
  _canvasContext = canvas.getContext('2d');
  _canvasContext.font = '8px sans-serif';
  _canvasContext.fillStyle = '#0a0a0a';
}
//
function initSymbolLists() {
  _slm_bg = getSymbolListManagerFromLS();
  _slm_bg.limit = 7;
  // recent symbol list
  var sl = _slm_bg.getListById('sl_recent');
  if (!sl) {
    sl = _slm_bg.createList('Recent', 'sl_recent', 8);
    sl.add('NASDAQ:GOOG', true);
    sl.add('NYSE:C');
    sl.add('NASDAQ:AAPL');
    sl.saveToLS();
  }
  sl.setLimit(8);
  sl.setEnable(false);
  // watch list
  sl = _slm_bg.getListById('sl_watch');
  if (!sl) {
    sl = _slm_bg.createList('Watch', 'sl_watch', 24);
    sl.add('NASDAQ:AAPL');
    sl.add('NYSE:C');
    _slm_bg.setCurrentList('sl_watch');
    sl.saveToLS();
  }
  sl.setLimit(24);
  // alert book
  sl = _slm_bg.getListById('sl_alert');
  if (!sl) {
    sl = _slm_bg.createList('Alerts', 'sl_alert', 24);
    sl.setVisible(false);
    sl.saveToLS();
  }
  sl.setLimit(24);
  sl.setVisible(true);
  // positions
  sl = _slm_bg.getListById('sl_portfolio');
  if (!sl) {
    sl = _slm_bg.createList('Portfolio', 'sl_portfolio', 15);
    sl.saveToLS();
  }
  sl.setVisible(true);
  // watch 2
  sl = _slm_bg.getListById('sl_watch2');
  if (!sl) {
    sl = _slm_bg.createList('Watch 2', 'sl_watch2', 15);
    sl.setVisible(false);
    sl.saveToLS();
  }
  // watch 3
  sl = _slm_bg.getListById('sl_watch3');
  if (!sl) {
    sl = _slm_bg.createList('Watch 3', 'sl_watch3', 15);
    sl.setVisible(false);
    sl.saveToLS();
  }
  // indexes
  sl = _slm_bg.getListById('sl_indexes');
  if (!sl) {
    sl = _slm_bg.createList('Indexes', 'sl_indexes', 25);
    sl.add('INDEXDJX:.DJI');
    sl.add('INDEXSP:.INX');
    sl.add('INDEXNASDAQ:.IXIC');
    sl.add('INDEXSTOXX:SX5E');
    sl.add('INDEXFTSE:UKX');
    sl.add('INDEXDB:DAX');
    sl.add('SHA:000001');
    sl.add('INDEXHANGSENG:HSI');
    sl.add('INDEXNIKKEI:NI225');
    sl.saveToLS();
  }
  
  _slm_bg.saveToLS();
}



//------------------------------------------------------------------------------
// Background Tasks
//------------------------------------------------------------------------------
function loopChangeIcon() {
  var config = getConfig('show_stock_on_icon');
  var showStockOnIcon = config ? config.val : 0;
  if (!showStockOnIcon) {
    if (getStrFromLS('icon_stock', '')) {
      saveStrToLS('icon_stock', '');
      setIconStock(null);
    }
  } else {
    switchIcon();
  }
  config = getConfig('icon_switch_interval');
  var timeout = 1000 * (config ? config.getValue() : 10);
  window.setTimeout(loopChangeIcon, timeout);
}
//
function loopRefreshData() {
  // refresh if data refresh's on
  if (getIntFromLS('refresh_data', 0)) {
    requestSubscriptions();
    window.setTimeout(checkAlerts, 5000);
  }
  // scehdule next refresh
  var config = getConfig('data_refresh_interval');
  var timeout = 1000 * (config ? config.getValue() : 10);
  window.setTimeout(loopRefreshData, timeout);
}
//
function loopAssessStatuses() {
  // access data refresh status
  saveStrToLS('refresh_data', assessDataRefreshStatus());
  // TODO: check alerts' statuses
  
  window.setTimeout(loopAssessStatuses, 1000 * 60 * 60); // check every hour
}
//
function assessDataRefreshStatus() {
  var config = getConfig('shut_down');
  if (!config)
    config = initOptionConfig('shut_down', ['Never', '8PM ~ 7AM', 'Midnight ~ 7AM'], 'Midnight ~ 7AM');
  var date = new Date();
  var hour = date.getHours();
  var dataRefreshStatus = '1'; // on
  if (1 == config.valIndex) { // shut down from 20:00 to 7:00
    if (hour >= 20 || hour < 6)
      dataRefreshStatus = '0'; // off
  } else if (2 == config.valIndex) { // shut down from 00:00 to 7:00
    if (hour < 6)
      dataRefreshStatus = '0'; // off
  }
  return dataRefreshStatus;
}
//
// Check and notify alerts
//
var _alertsToNotify = [];
function checkAlerts() {
  return; //TODO
  var sl = _slm_bg.getListById('sl_alert');
  var n = sl.size();
  var sa = null;
  var stock = null;
  var al = null;
  var hits = null;
  var j = 0;
  var config = getConfig('desktop_notify');
  for (var i = 0; i < n; ++ i) {
    sa = getStockAlertsFromLS(sl.at(i));
    if (!sa)
      continue;
    stock = getStockFromLS(sa.keyTicker);
    if (!stock)
      continue;
    hits = sa.check(stock);
    if (config.getValue()) {
      for (j = 0; j < hits.length; ++ j) {
        al = hits[j];
        _alertsToNotify.push(al);
      }
    }
  }
  processAlertNotifications();
}
//
function processAlertNotifications() {
  if (_alertsToNotify.length < 0)
    return;
  return; // TODO
  // Schedule next processing
  if (_alertsToNotify.length > 1)
    window.setTimeout(processAlertNotifications, 2500);
  try {
    // Create notification
    var notification = window.webkitNotifications.createHTMLNotification(
      chrome.extension.getURL('notify.html'));
    notification.show();
    var dismissTime = getConfig('notification_dismiss').getValue();
    if (dismissTime > 0)
      window.setTimeout(function(){ notification.cancel(); }, 1000 * dismissTime);
  } catch (e) {
    console.error(e);
  }
}



//------------------------------------------------------------------------------
// Icon display
//------------------------------------------------------------------------------
var badgeBgRed = [255, 0, 0, 255];
var badgeBgGreen = [0, 180, 0, 255];
var badgeBgBlack = [120, 120, 120, 255];
var badgeBgColors = [badgeBgRed, badgeBgGreen, badgeBgBlack];
//
function setBadgeQuote(quote, bgColor) {
  chrome.browserAction.setBadgeText({text: quote});
  chrome.browserAction.setBadgeBackgroundColor({color: bgColor});
}
//
function generateIconStockTooltip(stock) {
  if (stock.status)
    return stock.ticker + ' (' + stock.status + ') : ' + stock.effectiveLastPrice() + ' ' + stock.effectiveChange() + ' (' + stock.effectivePercentChange() + '%)';
  else
    return stock.ticker + ' : ' + stock.effectiveLastPrice() + ' ' + stock.effectiveChange() + ' (' + stock.effectivePercentChange() + '%)';
}
//
function setIconStock(stock) {
  var tooltip = '';
  var imgNodeId = '';
  if (!stock) {
    chrome.browserAction.setBadgeText({text: ''});
    imgNodeId = 'icon_img_default';
    tooltip = 'Stock Watch';
  } else {
    // badge text
    var config = getConfig('icon_text');
    var text = null;
    if (!config || config.valIndex == 0) { // badge show current price
      var priceFloat = stock.effectiveLastPriceFloat();
      text = priceFloat > 999.9 ? priceFloat.toString() : stock.effectiveLastPrice();
    } else if (config.valIndex == 1) // badge show price change
      text = stock.effectiveChange();
    else // badge show percentage change
      text = stock.effectivePercentChange();
    // badge color
    var color = null;
    config = getConfig('icon_color');
    if (!config || config.valIndex == 0) { // color represents price change
      var priceChange = parseFloat(stock.effectivePercentChange());
      color = badgeBgColors[compareFloat(priceChange, 0.0) + 1];
    } else { // color represents last tick or moving trend
      var value = config.valIndex == 1 ? stock.lastTick : stock.trend;
      if (value == 'u')
        color = badgeBgGreen;
      else if (value == 'd')
        color = badgeBgRed;
      else
        color = badgeBgBlack;
    }
    setBadgeQuote(text, color);
    // img node
    imgNodeId = 'icon_img_blank';
    // tooltip
    tooltip = generateIconStockTooltip(stock);
  }
  
  // set tooltip
  chrome.browserAction.setTitle({title: tooltip});
  // set background image
  var img = document.getElementById(imgNodeId);
  _canvasContext.drawImage(img, 0, 0);
  if (stock)
    _canvasContext.fillText(stock.ticker, 1, 9);
  var imgData = _canvasContext.getImageData(0, 0, 19, 19);
  try {
    chrome.browserAction.setIcon({imageData: imgData});
  } catch (e) {
    console.error("Could not set browser action icon '" + fullPath + "'.");
  }
}
//
function switchIcon() {
  var watchList = getSymbolListManagerFromLS().getListById('sl_watch');
  if (!watchList || watchList.size() < 1) {
    setIconStock(null);
    return;
  }
  // get stock ticker
  var currIconStockTicker = getStrFromLS('icon_stock', '');
  var nextIconStockTicker = '';
  if (!currIconStockTicker)
    nextIconStockTicker = watchList.at(0);
  else {
    var index = watchList.indexOf(currIconStockTicker);
    if (index == watchList.size() - 1)
      nextIconStockTicker = watchList.at(0);
    else
      nextIconStockTicker = watchList.at(index + 1);
  }
  // get stock obj
  var stock = getStockFromLS(nextIconStockTicker);
  setIconStock(stock);
  // update 'icon_stock'
  saveStrToLS('icon_stock', nextIconStockTicker);
}
